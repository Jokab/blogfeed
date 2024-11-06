async function post() {
    const blogs = await fetch("/blogs", {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "POST",
        },
        method: "POST",
        mode: "cors",
        cache: "no-cache",
        credentials: "same-origin",
        redirect: "follow",
        referrerPolicy: "no-referrer",
    });
    return blogs.json();
}

function setRowRead(row) {
    row.classList.add("read")
    const isReadEle = row.querySelector('[data-id="isRead"]');
    isReadEle.textContent = "✅"
}

function createBlogRow(blog) {  
    const date = new Date(blog.lastUpdateDate);

    const isRead = blog.clicked === true;
    const isReadEle = document.createElement("div");
    isReadEle.setAttribute("data-id", "isRead");
    
    const time = document.createElement("div");
    time.setAttribute("data-id", "time");
    const dateIsLastYear = date.getFullYear() < new Date().getFullYear();
    time.textContent = date.toLocaleString('sv-SE', 
        { 
            day: 'numeric', 
            month: 'short', 
            year: dateIsLastYear ? "numeric" : undefined 
        }).replace(".", "");

    const title = document.createElement("div");
    title.setAttribute("data-id", "title");
    title.textContent = blog.title;

    const blogName = document.createElement("div");
    blogName.setAttribute("data-id", "blogName");
    blogName.textContent = `${blog.name}`

    const row = document.createElement("a");
    row.href = blog.url;
    row.target = "_blank";
    row.classList.add("row")
    row.setAttribute("data-id", "row")
    row.addEventListener("click", (e) => {
        fetch("/clickBlog", {
            method: "POST", 
            body: JSON.stringify({ blogId: blog.id }), 
            headers: { "Content-Type": "application/json" }})
        .then(() => {
            const dataId = e.target.getAttribute("data-id")
            const row = dataId === "row" 
                ? e.target
                : e.target.closest('[data-id="row"]');
            setRowRead(row);
        })
        .catch(() => console.error("Failed to send click event"));
    });

    row.appendChild(isReadEle);
    row.appendChild(time);
    row.appendChild(title);
    row.appendChild(blogName);

    if (isRead) {
        setRowRead(row);
    }

    return row;
}

function createBlogsGrid(blogData) {
    document.getElementById("loading").remove();
    const contentElement = document.getElementById("content");
    const byDateDescending = (a,b) => new Date(b.lastUpdateDate) - new Date(a.lastUpdateDate);

    const rows = blogData.flatMap(x => x.map(y => y))
        .sort(byDateDescending)
        .map(createBlogRow);
    
    rows.forEach(row => contentElement.appendChild(row));
}

post()
.then(createBlogsGrid)
.catch((error) =>  {
    console.error(error);
    document.getElementById("loading").remove();
    const errorMsg = document.createElement("h2");
    errorMsg.textContent = "Något gick fel, försök igen senare.";
    document.getElementById("content").appendChild(errorMsg);
});