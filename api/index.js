const express = require('express')
const path = require('path');
const app = express()
require('dotenv').config();

const Parser = require('rss-parser');
const parser = new Parser();
const kv = require('@vercel/kv');

const elleBlogs = [
  {name: "Sandra Beijer", url: "https://sandrabeijer.elle.se"},
  {name: "Flora Wiström", url: "https://flora.elle.se"},
  {name: "Elsa Billgren", url: "https://elsa.elle.se"}
]

const bffEllen = {
  name: "Ellen Strömberg",
  url: "https://www.bffellen.com/blog-1?format=json"
}

const juliaEriksson = {
  name: "Julia Eriksson",
  url: "https://juliaeriksson.se/"
}

app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const pagesToGet = 3;

async function getEllen() {
  const res = await fetch("https://www.bffellen.com/blog-1?format=json");
  const items = (await res.json()).items;
  const sorted = items.sort((a, b) => b !== undefined ? new Date(b.addedOn) - new Date(a.addedOn) : a);
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

async function getJulia() {
  const res = await fetch(new URL("/wp-json/wp/v2/posts", juliaEriksson.url));
  const items = (await res.json());
  const sorted = items.sort((a, b) => b !== undefined ? new Date(b.date) - new Date(a.date) : a);
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

async function getSardellen() {
  const res = await parser.parseURL("https://sardellen.wordpress.com/feed");
  const sorted = res.items.sort((a, b) => b !== undefined ? new Date(b.pubDate) - new Date(a.pubDate) : a);
  return sorted.slice(0,3).map(blogPost => {
    return {
      name: "Sardellen", 
      lastUpdateDate: new Date(blogPost.pubDate), 
      url: blogPost.link, 
      title: blogPost.title,
      id: blogPost.title.replaceAll(" ", "-")
    };
  });
}

async function getSar_As() {
  const res = await parser.parseURL("https://sar.as/feed");
  const sorted = res.items.sort((a, b) => b !== undefined ? new Date(b.pubDate) - new Date(a.pubDate) : a);
  return sorted.slice(0,3).map(blogPost => {
    return {
      name: "Sar.as", 
      lastUpdateDate: new Date(blogPost.pubDate), 
      url: blogPost.link, 
      title: blogPost.title,
      id: blogPost.title.replaceAll(" ", "-")
    };
  });
}


function getElle() {
  return elleBlogs.flatMap(async (blog) => {
    const blogs = []
    for (let i = 1; i <= pagesToGet; i++) {
      const res = await fetch(blog.url+"/api/post?page="+i);
      const blogPost = (await res.json()).data[0];
      const date = blogPost.date;
      
      blogs.push({
        name: blog.name, 
        lastUpdateDate: date, 
        url: new URL(blogPost.url, blog.url), 
        title: blogPost.title,
        id: blogPost.id
      });
    }
    return blogs;
  })
}

async function getBlogData() {
  const requests = [
    ...getElle(), 
    getEllen(),
    getJulia(),
    getSardellen(),
    getSar_As()
  ];
  return Promise.all(requests);
}

async function getClickedIfCached(blogData) {
  const allBlogIds = blogData.flatMap(x => x.map(y => y.id));
  const clickedBlogIds = await getClickedBlogIds(allBlogIds);

  if (clickedBlogIds && clickedBlogIds.length > 0) {
    return blogData.map(blog => 
      blog.map(blogPost => 
        ({...blogPost, clicked: clickedBlogIds.some(x => x === blogPost.id)})
      )
    );
  }
  return blogData;
}

async function getClickedBlogIds(blogIds) {
  const cachedData = await kv.kv.smismember("clicked", blogIds);
  const result = blogIds.filter((_, i) => cachedData[i] === 1);
  return result;
}
 
app.post('/clickBlog', async (req, res) => {
  try {
    const result = await kv.kv.sadd("clicked", req.body.blogId);
    return res.sendStatus(200);
  } catch (error) {
    console.error(error);
    return res.send('Kunde inte spara bloggklick')
  }
})

app.post('/blogs', async (_, res) => {
  try {
    const blogData = await getBlogData();
    const updatedBlogData = await getClickedIfCached(blogData);

    return res.send(updatedBlogData)
  } catch (error) {
    console.error(error);
    return res.send('Nåt gick fel :(')
  }
})

app.listen(process.env.PORT, () => {
  console.log(`Running on port ${process.env.PORT}.`);
});
module.exports = app