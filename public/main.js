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

function addIsRead(row, blog) {
    const isRead = blog.clicked === true;
    const isReadEle = document.createElement("div");
    isReadEle.setAttribute("data-id", "isRead");

    row.appendChild(isReadEle);
    if (isRead) {
        setRowRead(row);
    }

    return row;
}

function addTime(row, blog) {
    const date = new Date(blog.lastUpdateDate);

    const time = document.createElement("div");
    time.setAttribute("data-id", "time");
    const dateIsLastYear = date.getFullYear() < new Date().getFullYear();
    time.textContent = date.toLocaleString('sv-SE', 
        { 
            day: 'numeric', 
            month: 'short', 
            year: dateIsLastYear ? "numeric" : undefined 
        }).replace(".", "");
        row.appendChild(time);

    return row;
}

function addTitle(row, blog) {
    const title = document.createElement("div");
    title.setAttribute("data-id", "title");
    title.textContent = blog.title;
    row.appendChild(title);

    return row;

}

function addBlogName(row, blog) {
    const blogName = document.createElement("div");
    blogName.setAttribute("data-id", "blogName");
    blogName.textContent = `${blog.name}`
    row.appendChild(blogName);

    return row;
}


function pipe(row, ...fns) {
    return fns.reduce((acc, fn) => fn(acc), row);
}

function createBlogRow(blog) {  
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

    return row;
}

function createBloggerSection(dataForBlogger) {
    const bloggerSection = document.createElement("div");
    const heading = document.createElement("h1");
    heading.classList.add("bloggerHeading")
    heading.innerHTML = dataForBlogger[0].name;
    const blogsGrid = document.createElement("div")

    dataForBlogger
        .map(blog => 
            pipe(
                createBlogRow(blog),
                r => addIsRead(r, blog),
                r => addTime(r, blog),
                r => addTitle(r, blog),
            )
        )
        .forEach(x => blogsGrid.appendChild(x));

    bloggerSection.appendChild(heading);
    bloggerSection.appendChild(blogsGrid);

    return bloggerSection;
}

const blogByDateDescending = (a,b) => 
    new Date(b.lastUpdateDate) - new Date(a.lastUpdateDate);

function listChronologically(blogData) {

    return blogData
        .flatMap(x => x.map(y => y))
        .sort(blogByDateDescending)
        .map(blog => 
            pipe(
                createBlogRow(blog),
                r => addIsRead(r, blog),
                r => addTime(r, blog),
                r => addTitle(r, blog),
                r => addBlogName(r, blog)
            )
        );
}

function groupByBlogger(blogData) {
    const bloggersByDateDescending = (blogger1,blogger2) => 
        blogByDateDescending(
            blogger1.sort(blogByDateDescending)[0], 
            blogger2.sort(blogByDateDescending)[0]
        );

    return blogData
        .sort(bloggersByDateDescending)
        .map(createBloggerSection)
}

function listBlogs(blogData) {
    const contentElement = document.getElementById("content");
    contentElement.replaceChildren();

    (isChronologicalGrid
        ? groupByBlogger(blogData)
        : listChronologically(blogData))
        .forEach(row => contentElement.appendChild(row));
}

let isChronologicalGrid = false;
let blogData = undefined;

toggler.addEventListener("click", () => {
    isChronologicalGrid = !isChronologicalGrid;
    listBlogs(blogData);
})

post()
.then((res) => {
    const loadingEle = document.getElementById("loading");
    if (loadingEle) loadingEle.remove();
    blogData = res;
    listBlogs(blogData)
})
.catch((error) =>  {
    console.error(error);
    document.getElementById("loading").remove();
    const errorMsg = document.createElement("h2");
    errorMsg.textContent = "Något gick fel, försök igen senare.";
    document.getElementById("content").appendChild(errorMsg);
});