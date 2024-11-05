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
        res.flatMap(x => x.map(y => y)).sort((a,b) => new Date(b.lastUpdateDate) - new Date(a.lastUpdateDate)). //.forEach(blogEntries => {
            // const header = document.createElement("h2");
            // header.textContent = blogEntries[0].name;
            // document.getElementById("content").appendChild(header);
            // const blogList = document.createElement("ul");
            forEach(blog => {
                const link = document.createElement("a");
                link.href = blog.url;
                link.target = "_blank";
                const listItem = document.createElement("p");
                const date = new Date(blog.lastUpdateDate);
                
                const isRead = (localStorage.getItem(blog.id) !== undefined && localStorage.getItem(blog.id) === "true")
                    || blog.clicked === true;
                link.textContent = `${isRead ? "✅" : ""} ${date.getDate()}/${date.getMonth() + 1} ${date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })} - ${blog.title} - ${blog.name}`
                link.addEventListener("click", () => {
                    localStorage.setItem(blog.id, "true");
                    fetch("/clickBlog", {
                        method: "POST", 
                        body: JSON.stringify({ blogId: blog.id }), 
                        headers: { "Content-Type": "application/json" }})
                    .then(() => console.log("Successfully sent click event"))
                    .catch(() => console.error("Failed to send click event"));
                });
                listItem.appendChild(link);
                document.getElementById("content").appendChild(listItem);
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