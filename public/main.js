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

post()
    .then((res) => {
        document.getElementById("loading").remove();
        res
            .flatMap(x => x.map(y => y))
            .sort((a,b) => new Date(b.lastUpdateDate) - new Date(a.lastUpdateDate))
            .forEach(blog => {
                const row = document.createElement("div");
                row.classList.add("row")
                
                const date = new Date(blog.lastUpdateDate);

                const isRead = (localStorage.getItem(blog.id) !== undefined && localStorage.getItem(blog.id) === "true")
                || blog.clicked === true;
                const isReadEle = document.createElement("div");
                isReadEle.textContent = isRead ? "✅" : "";
                
                const time = document.createElement("div");
                const datePart = document.createElement("div")
                const timePart = document.createElement("div")
                time.classList.add("time");
                datePart.textContent = `${date.getDate()}/${date.getMonth() + 1}`;
                timePart.textContent = `${date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
                time.appendChild(datePart)
                // time.appendChild(timePart)

                const title = document.createElement("a");
                title.href = blog.url;
                title.target = "_blank";
                title.textContent = blog.title;
                title.classList.add("title")

                const blogName = document.createElement("div");
                blogName.textContent = `${blog.name}`

                title.addEventListener("click", () => {
                    localStorage.setItem(blog.id, "true");
                    fetch("/clickBlog", {
                        method: "POST", 
                        body: JSON.stringify({ blogId: blog.id }), 
                        headers: { "Content-Type": "application/json" }})
                    .then(() => console.log("Successfully sent click event"))
                    .catch(() => console.error("Failed to send click event"));
                });
                
                if (isRead) {
                    isReadEle.classList.add("read")
                    time.classList.add("read")
                    title.classList.add("read")
                    blogName.classList.add("read")
                }
                row.appendChild(isReadEle);
                row.appendChild(time);
                row.appendChild(title);
                row.appendChild(blogName);
                document.getElementById("content").appendChild(row);
            });
            // document.getElementById("content").appendChild(blogList);
        })
    
    .catch((error) =>  {
        console.error(error);
        document.getElementById("loading").remove();
        const errorMsg = document.createElement("h2");
        errorMsg.textContent = "Något gick fel, försök igen senare.";
        document.getElementById("content").appendChild(errorMsg);
    });