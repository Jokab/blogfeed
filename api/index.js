const express = require('express')
const path = require('path');
const app = express()

const elleBlogs = [
  {name: "Sandra", url: "https://sandrabeijer.elle.se"},
  {name: "Flora", url: "https://flora.elle.se"},
  {name: "Elsa", url: "https://elsa.elle.se"}
]

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', function (req, res) {
	res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

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
        title: blogPost.title,
        id: blogPost.id
      };
    }));

    res.set('Access-Control-Allow-Origin', 'localhost')
    return res.send(response)
  } catch (error) {
    console.error(error);
    return res.send('Nåt gick fel :(')
  }
})

app.listen(process.env.PORT, () => {
  console.log(`Running on port ${process.env.PORT}.`);
});
module.exports = app