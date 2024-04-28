const express = require('express')
const jsdom = require("jsdom");
const app = express()
const port = 3000

const elleBlogs = [
  {name: "Flora", url: "https://flora.elle.se"},
  {name: "Elsa", url: "https://elsa.elle.se"}
]

app.post('/blogs', async (req, res) => {
  try {
    const response = await Promise.all(elleBlogs.map(async blog => {
      const res = await fetch(blog.url+"/api/post");
      const blogPost = (await res.json()).data[0];
      const date = blogPost.date;
      return {
        name: blog.name, 
        lastUpdateDate: date, 
        url: new URL(blogPost.url, blog.url), 
        title: blogPost.title
      };
    }));

    res.set('Access-Control-Allow-Origin', 'localhost')
    return res.send(response)
  } catch (error) {
    console.error(error);
    return res.send('Nåt gick fel :(')
  }
})

app.listen(port, () => {
  console.log(`Blogs app listening on port ${port}`)
})