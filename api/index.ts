import express, { Request, Response } from 'express';
import path from 'path';
import Parser from 'rss-parser';
import * as kv from '@vercel/kv';
import dotenv from 'dotenv';
import { Blog, BlogPost, EllenBlogPost, JuliaBlogPost, ElleBlogPost } from './types';

dotenv.config();
const app = express();
const parser = new Parser();

const elleBlogs: Blog[] = [
  {name: "Sandra Beijer", url: "https://sandrabeijer.elle.se"},
  {name: "Flora Wiström", url: "https://flora.elle.se"},
  {name: "Elsa Billgren", url: "https://elsa.elle.se"},
  {name: "Anja Olaug", url: "https://anjaolaug.elle.se"}
];

const bffEllen: Blog = {
  name: "Ellen Strömberg",
  url: "https://www.bffellen.com/blog-1?format=json"
};

const juliaEriksson: Blog = {
  name: "Julia Eriksson",
  url: "https://juliaeriksson.se/"
};

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', function (_: Request, res: Response) {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const pagesToGet = 3;

async function getEllen(): Promise<BlogPost[]> {
  const res = await fetch("https://www.bffellen.com/blog-1?format=json");
  const items = (await res.json()).items as EllenBlogPost[];
  const sorted = items.sort((a, b) => b !== undefined ? new Date(b.addedOn).getTime() - new Date(a.addedOn).getTime() : 0);
  return sorted.slice(0,3).map(blogPost => {
    return {
      name: bffEllen.name, 
      lastUpdateDate: new Date(blogPost.addedOn), 
      url: new URL(blogPost.fullUrl, "https://www.bffellen.com/"), 
      title: blogPost.title,
      id: blogPost.id
    };
  });
}

async function getJulia(): Promise<BlogPost[]> {
  const res = await fetch(new URL("/wp-json/wp/v2/posts", juliaEriksson.url));
  const items = (await res.json()) as JuliaBlogPost[];
  const sorted = items.sort((a, b) => b !== undefined ? new Date(b.date).getTime() - new Date(a.date).getTime() : 0);
  return sorted.slice(0,3).map(blogPost => {
    return {
      name: juliaEriksson.name, 
      lastUpdateDate: new Date(blogPost.date), 
      url: blogPost.link, 
      title: blogPost.title.rendered,
      id: blogPost.id
    };
  });
}

async function getSardellen(): Promise<BlogPost[]> {
  const res = await parser.parseURL("https://sardellen.wordpress.com/feed");
  const sorted = res.items.sort((a: any, b: any) => b !== undefined ? new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime() : 0);
  return sorted.slice(0,3).map((blogPost: any) => {
    return {
      name: "Sardellen", 
      lastUpdateDate: new Date(blogPost.pubDate), 
      url: blogPost.link, 
      title: blogPost.title,
      id: blogPost.title.replaceAll(" ", "-")
    };
  });
}

async function getSar_As(): Promise<BlogPost[]> {
  const res = await parser.parseURL("https://sar.as/feed");
  const sorted = res.items.sort((a: any, b: any) => b !== undefined ? new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime() : 0);
  return sorted.slice(0,3).map((blogPost: any) => {
    return {
      name: "Sar.as", 
      lastUpdateDate: new Date(blogPost.pubDate), 
      url: blogPost.link, 
      title: blogPost.title,
      id: blogPost.title.replaceAll(" ", "-")
    };
  });
}

function getElle(): Promise<BlogPost[]>[] {
  return elleBlogs.map(async (blog) => {
    const blogs: BlogPost[] = [];
    for (let i = 1; i <= pagesToGet; i++) {
      const res = await fetch(blog.url+"/api/post?page="+i);
      const blogPost = (await res.json()).data[0] as ElleBlogPost;
      const date = blogPost.date;
      
      blogs.push({
        name: blog.name, 
        lastUpdateDate: new Date(date), 
        url: new URL(blogPost.url, blog.url), 
        title: blogPost.title,
        id: blogPost.id
      });
    }
    return blogs;
  });
}

async function getBlogData(): Promise<BlogPost[]> {
  const requests = [
    ...getElle(), 
    getEllen(),
    getJulia(),
    getSardellen(),
    getSar_As()
  ];
  return (await Promise.all(requests)).flatMap(x => x);
}

async function getClickedIfCached(blogData: BlogPost[]): Promise<BlogPost[]> {
  const allBlogIds = blogData.map(y => y.id);
  const clickedBlogIds = await getClickedBlogIds(allBlogIds);

  if (clickedBlogIds && clickedBlogIds.length > 0) {
    return blogData.map(blogPost => 
      ({...blogPost, clicked: clickedBlogIds.some(x => x === blogPost.id)})
    );
  }
  return blogData;
}

async function getClickedBlogIds(blogIds: (string | number)[]): Promise<(string | number)[]> {
  const cachedData = await kv.kv.smismember("clicked", blogIds);
  return blogIds.filter((_, i) => cachedData[i] === 1);
}

const storeNewBlogsInCache = async (blogs: BlogPost[]): Promise<void> => {
  const blogMap: Record<string, BlogPost> = blogs.reduce((acc, item) => {
    acc[`blog-${item.id}`] = item;
    return acc;
  }, {} as Record<string, BlogPost>);
  
  await kv.kv.mset(blogMap);
};
 
app.post('/api/clickBlog', async (req: Request, res: Response) => {
  try {
    await kv.kv.sadd("clicked", req.body.blogId); 
    return res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.send('Kunde inte spara bloggklick');
  }
});

const getCachedValues = async (): Promise<BlogPost[]> => {
  const cachedKeys = await kv.kv.scan(0, {match: "blog-*", count: 30});
  return cachedKeys && cachedKeys[1].length > 0
    ? await kv.kv.mget(cachedKeys[1])
    : [];
};

app.post('/api/blogs', async (_: Request, res: Response) => {
  try {
    const cachedValues = await getCachedValues();
    const fetchedBlogData = await getBlogData();
    const blogsNotInCache = fetchedBlogData
      .filter(x => !cachedValues
        .map(y => y.id)
        .includes(x.id)
      );
    if (blogsNotInCache && blogsNotInCache.length > 0) {
      await storeNewBlogsInCache(blogsNotInCache);
    }

    const allBlogs = blogsNotInCache.concat(cachedValues);
    const updatedBlogData = await getClickedIfCached(allBlogs);

    return res.send(updatedBlogData);
  } catch (error) {
    console.error(error);
    return res.send('Nåt gick fel :(');
  }
});

// For compatibility - support both paths with and without /api prefix
app.post('/blogs', (req: Request, res: Response) => {
  return app._router.handle(req, res, '/api/blogs');
});

app.post('/clickBlog', (req: Request, res: Response) => {
  return app._router.handle(req, res, '/api/clickBlog');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Running on port ${port}.`);
});

export default app;
