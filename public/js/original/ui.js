var replyOffset = 0;
var tableOffset = 0;
var topicOffset = 0;
var proposalOffset = 0;
var offset = 0;
var sort = localStorage.getItem('sort') || 4;
var contain = 1;
var counter = 0;
var PPupdate = "5. 1. 2021";
var media = window.matchMedia("only screen and (max-width: 740px)").matches;
var mobile_blur = false;
var flash = document.querySelector(".flash-container");
var i = 0;

var root=document.documentElement;
var rand=Math.floor(Math.random()*2080);
if (rand == 70 || rand == 421){
    if (rand == 0){
        root.style.setProperty('--rare1', "#71d18b");
    } else {
        root.style.setProperty('--rare1', "#f182a0");
    }
}
if(!media){
    root.style.setProperty("--left", Math.floor(2035*Math.random())+"px"), root.style.setProperty("--top", Math.floor(4554*Math.random())+"px");
} else{
    root.style.setProperty("--left", Math.floor(1500*Math.random())+"px"),root.style.setProperty("--top", Math.floor(1700*Math.random())+"px");
}

// Block post loading on normal sites
if (/about|policies|stats|register|post|createTopic|payment|payment_invoice|reset|\/act/.test(window.location.href)){
    var style = document.querySelectorAll('.drop-btn');
    for(i = 0; i < style.length; i++)
    {
        style[i].style.pointerEvents = "none";
        style[i].style.backgroundImage = "url('../../../img/bg.png')";
        style[i].setAttribute('value', 'readonly');
        style[i].setAttribute('tabindex', -1);
    }

    // Privacy policy last update
    if (/register|policies/.test(window.location.href)) {
        window.addEventListener("load", function() {
            document.getElementById("PPupdate").innerHTML = PPupdate;
        });
    }
    // Image preview
    else if(/post|createTopic/.test(window.location.href)) {
        document.body.addEventListener("change", () => {
            try {
                const user_file = document.getElementById("user_file");
                const [file] = user_file.files;
                if (file) {
                document.getElementById("image_preview").src = URL.createObjectURL(file);
                }
            } catch (error) {
                
            }
        });
    }
    else if (/reset/.test(window.location.href)){
        window.addEventListener("load", function() {
            var collapsible = document.querySelectorAll(".collapsible");
            for (let i = 0; i < collapsible.length; i++) {
                collapsible[i].addEventListener("click", function() {
                    collapsible[i].nextElementSibling.classList.toggle('show');;
                }); 
            }
        });
    } 
}

// Sw
if('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../../../service-worker.js');
} // click listener  for offline saves

// Themes
var theme = 0;
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
function applyTheme() {
    var cookie = parseInt(getCookie("theme"));
    var hs = document.getElementsByTagName('style');
    var style = document.createElement('style');
    if(hs.length > 1)
        for (var i=0, max=hs.length; i < max; i++) {
            hs[i].parentNode.removeChild(hs[i]);
        }
    switch(cookie) {
        case 0:
            theme = 0;
            break;
        case 1:
            theme = 1;
            style.innerHTML = `
                li:hover {
                    background: hsla(${Math.floor(Math.random() * 361)}, 95%, 75%) !important;
                }
                .dropdown-content button:hover {
                    background: hsla(${Math.floor(Math.random() * 361)}, 95%, 75%) !important;
                }
                .message3, .autocomplete-box li:hover, .suggest-box li:hover, .copy, .read {
                    background: hsla(${Math.floor(Math.random() * 361)}, 95%, 75%) !important;
                }
                .autocomplete-box li, .explore {
                    background: hsla(${Math.floor(Math.random() * 361)}, 75%, 85%, 0.5) !important;
                }
                /*.drop-btn,*/ .flash-message-text, .selected-sorting /*, .cancel*/ {
                    background-color: hsla(${Math.floor(Math.random() * 361)}, 85%, 75%, 0.5) !important;
                }
                #name input {
                    color: var(--outline);
                }
                .explore-top {
                    background: hsla(${Math.floor(Math.random() * 361)}, 75%, 85%) !important;
                }
                .topic {
                    border-color: hsla(${Math.floor(Math.random() * 361)}, 95%, 75%) !important;
                }
                .message-text1 {
                    color: hsla(${Math.floor(Math.random() * 361)}, 70%, 50%) !important;
                }
                /*.report {
                    background: #fffffff0 !important;
                }*/
            `;
            document.head.appendChild(style);
            break;
        case 2:
            theme = 0;
            style.innerHTML = `
                body {
                    background: black;
                }
                .user-input > div > form > div, .user-input > div > form > button, .user-input > div > form > a, .container, .load-container , header, .search, .flash-container, .post_form, 
                .explore-container, .attachment-container, iframe, #canvas, .notes, .user-settings, .content_d, .high, .crypto-container {
                    filter: invert();
                }
                .blurred {
                    filter: blur(0.4em) sepia(0.3) brightness(90%) invert();
                }
                .notes > .notes {
                    filter: invert(0);
                }
                .social-icons > img, img.notification-icon {
                    filter: invert(0.1) !important;
                }
                header, .post, .explore-top {
                    box-shadow: -3px 6px 35px var(--gray) !important;
                }
                .user-input {
                    background: radial-gradient(#00000080, transparent);
                }
                .report {
                    background: #000000f0;
                }
                .shade {
                    background-color: #0006;
                }
                .explore-top {
                    background-color: #ffffff80;
                }
                .all-reply-container, .gallery{
                    filter: invert(90%);
                }
            `;
            document.head.appendChild(style);
            break;
        case 3:
            theme = 0;
            style.innerHTML = `
                body {
                    background: black;
                }
                .user-input > div > form > div, .user-input > div > form > button, .user-input > div > form > a, .container, .load-container , header, .search, 
                .flash-container, .post_form, .attachment-container, iframe, #canvas, .notes, .user-settings, .content_d, .explore-container, .high, .crypto-container {
                    filter: invert();
                }
                .notes > .notes {
                    filter: invert(0);
                }
                .social-icons > img, img.notification-icon {
                    filter: invert(0.1) !important;
                }
                .user-input {
                    background: radial-gradient(#00000080, transparent);
                }

                header, .post, .explore-top {
                    box-shadow: -3px 6px 55px hsla(${Math.floor(Math.random() * 361)}, 95%, 75%, 0.9) !important;
                }
                .report {
                    background: #000000f0;
                }
                .shade {
                    background-color: #0006;
                }
                .explore-top {
                    background-color: #ffffff80;
                }
                .all-reply-container, .gallery{
                    filter: invert(90%);
                }
            `;
            document.head.appendChild(style);
            break;
        case 4:
            theme = 1;
            style.innerHTML = `
                body {
                    background: black;
                }
                .user-input > div > form > div, .user-input > div > form > button, .user-input > div > form > a, .container, .load-container , header, .search, 
                .flash-container, .attachment-container, iframe, #canvas, .notes, .user-settings, main > #reply, .content_d, .explore-container, .high, .crypto-container {
                    filter: invert();
                }
                .notes > .notes {
                    filter: invert(0);
                }
                .social-icons > img, img.notification-icon {
                    filter: invert(0.1) !important;
                }
                header, .post, .explore-top {
                    box-shadow: -3px 6px 50px var(--gray);
                }
                .user-input {
                    background: radial-gradient(#00000080, transparent);
                }

                li:hover {
                    background: hsla(${Math.floor(Math.random() * 361)}, 95%, 75%) !important;
                }
                .dropdown-content button:hover {
                    background: hsla(${Math.floor(Math.random() * 361)}, 95%, 75%) !important;
                }
                .message3, .autocomplete-box li:hover, .suggest-box li:hover, .copy, .read {
                    background: hsla(${Math.floor(Math.random() * 361)}, 95%, 75%) !important;
                }
                .autocomplete-box li, .explore {
                    background: hsla(${Math.floor(Math.random() * 361)}, 95%, 85%, 0.5) !important;
                }
                /*.drop-btn, */.flash-message-text, .selected-sorting {
                    background-color: hsla(${Math.floor(Math.random() * 361)}, 85%, 75%, 0.5) !important;
                }
                /*#name input {
                    color: white;
                }*/
                .explore-top {
                    background: hsla(${Math.floor(Math.random() * 361)}, 95%, 85%) !important;
                }
                .topic {
                    border-color: hsla(${Math.floor(Math.random() * 361)}, 95%, 75%) !important;
                }
                .message-text1 {
                    color: hsla(${Math.floor(Math.random() * 361)}, 70%, 40%) !important;
                }

                .report {
                    background: #000000f0;
                }
                .shade {
                    background-color: #0006;
                }
                .all-reply-container, .gallery{
                    filter: invert(90%);
                }
            `;
            document.head.appendChild(style);
            break;  
        default:
            console.log("No theme selected.");
            break;
    }
}
function setTheme(theme) {
    const d = new Date();
    d.setTime(d.getTime() + (365*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = "theme=" + theme + ";domain=.scrooc.com;" + expires + ";path=/;samesite=lax;";
}
function themeSwitch() {
    var theme = + parseInt(getCookie("theme")) + 1;
    if(theme > 4) {
        theme = 0;
    }
    console.log(theme);
    fetch(`/saveTheme/${theme}`)
        .then(response => response.json())
        .then(results => {
            location.reload();
        });
    setTheme(theme);
}
function generatePaint(strength) {
    if (!strength)
        strength = 0;

    var rnd = Math.floor(Math.random() * 361);
    var c1 = "hsla(" + rnd + ", " + (75-strength) + "%, 80%);";
    var c2 = "hsla(" + rnd + ", " + (75-strength) + "%, 68%);";
    var c3 = "hsla(" + rnd + ", " + (30) + "%, 50%);";
    return [c1, c2, c3];
}
applyTheme();

// Post sorting
function sortBy(sortBy){
    if(typeof sortBy !== 'undefined')
        sort = sortBy;
    offset = 0;

    var menuColor = document.querySelectorAll("#dropdown-content > button:not(.copy), #mobile-dropdown-content > button:not(.copy)");
    var temp = +sort + +(menuColor.length/2);
    for (i = 0; i < menuColor.length; i++) {
        menuColor[i].classList.remove("selected-sorting");
    }
    menuColor[sort].classList.add("selected-sorting");
    menuColor[temp].classList.add("selected-sorting");

    // Save setting for later
    localStorage.setItem('sort', sort);
    getPosts();
}
// Policy switch
function policyLoad(policy){
    switch (policy) {
        case undefined:
        case '1':
            document.getElementById('privacy-policy').style.display = 'block';
            document.getElementById('terms-of-service').style.display = 'none';
            document.querySelector('h4.message-text').innerHTML = "Privacy policy";
            break;
        case '2':
            document.getElementById('privacy-policy').style.display = 'none';
            document.getElementById('terms-of-service').style.display = 'block';
            document.querySelector('h4.message-text').innerHTML = "Terms of service";
            break;
    }
}
// Change image fit
function changeStyle(){
    if(!media) {
        var object_fit = 0;
        // Cycle through object_fits
        switch(contain){
            case 0:
                object_fit = 'contain';
                break;
            case 1:
                object_fit = 'cover';
                break;
            case 2:
                object_fit = 'fill';
                break;
        }
    
        var style = document.querySelectorAll('img.attachment');
        var length = style.length;
        // Set it for every iteration
        for(i = 0; i < length; i++){
            style[i].style.objectFit = object_fit;
        }
    
        // Cycle and reset
        contain++;
        if(contain > 2)
            contain = 0;
    }
}
// Deblur mobile
function blur_mobile(el){
    if(media) {
        if(mobile_blur)
            el.classList.remove("topic_blurred_mobile");
        else
            el.classList.add("topic_blurred_mobile");
        mobile_blur = !mobile_blur;
    }
}

// Fetch and save content
function getPosts(idk){
    var where = 'undefined';
    var temp = window.location.href;

    // Get specific posts only for certain pages
    if (/profile/.test(window.location.href)) {
        where = 'profile';
    }
    else if (/topic/.test(window.location.href)){
        where = temp.substring(temp.indexOf("topic/") + 6).replace('/', '');

        document.title = where + " on Scrooc";
        document.querySelector('img.qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${temp}`;
        document.querySelector('img.qr').alt = `${temp} topic on Scrooc.com`;

        var ogtitle = document.createElement('meta');
        ogtitle.name = "og:title";
        ogtitle.content = where + " on Scrooc";
        document.head.appendChild(ogtitle);

        fetch(`/loadKeywords/topic/${where}`)
            .then(response => response.json())
            .catch(() => {
                flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading keywords. Try again later.</h4></div>`);
            })
            .then(results => {
                var meta = document.createElement('meta'); 
                    meta.name = 'keywords';
                    for(i = 0; i < results.length; i++) {
                        if(i == results.length-1)
                            meta.content += results[i].tag;
                        else
                            meta.content += results[i].tag + ', ';
                    }
                    document.head.appendChild(meta);
            });
    } 
    else if (/sact/.test(window.location.href)){
        where = temp.substring(temp.indexOf("sact/") + 5).replace('/', '');
        
        document.title = where + " on Scrooc";
        try {
            document.querySelector('img').alt = `${temp} on Scrooc.com`;
        } catch{
            console.log('No image');
        }
        where = temp.substring(temp.indexOf("sact/")).replace('/', '');

        var ogtitle = document.createElement('meta');
        ogtitle.name = "og:title";
        ogtitle.content = where + " on Scrooc";
        document.head.appendChild(ogtitle);
        var ogdesc = document.createElement('meta');
        ogdesc.name = "og:description";
        ogdesc.content = "Search results for " + where + " on Scrooc.com.";
        document.head.appendChild(ogdesc);

        var meta = document.createElement('meta'); 
            meta.name = 'description'; 
            meta.content = "Search results for " + where + " on Scrooc.com.";
            document.head.appendChild(meta);
    } 
    else if (/explore/.test(window.location.href))
        where = 'explore';
    else if (/mod/.test(window.location.href)) {
        where = 'mod';
        if(idk)
            where = 'mod'+idk;
    }

    fetch(`/load/${offset}/${sort}/${where}/`)
        .then(response => response.json())
        .catch(() => {
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading. Try again later.</h4></div>`);
        })
        .then(results => {
            if(results.length > 1)
                if(results[0].results && !idk)
                    return loadIframeIntoSection(results);
            loadPostsIntoSection(results);
        });
}
function loadTable(){
    fetch(`/loadTable/${tableOffset}`)
        .then(response => response.json())
        .catch(() => {
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading. Try again later.</h4></div>`);
        })
        .then(results => loadIntoTable(results));
}
function getReplies(id){
    fetch(`/loadReplies/${id}/${replyOffset}`)
        .then(response => response.json())
        .catch(() => {
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading. Try again later.</h4></div>`);
        })
        .then(results => loadReplies(results));
}
function getTopics(){
    var where;
    var temp = window.location.href;
    if (/sact/.test(temp)){
        where = temp.substring(temp.indexOf("sact/")).replace('/', '');
    } 

    fetch(`/loadTopic/${topicOffset}/4/${where}/`)
        .then(response => response.json())
        .catch(() => {
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading. Try again later.</h4></div>`);
        })
        .then(results => {
            loadTopicsIntoSection(results);
        });
}
function getProposals(){
    fetch(`/loadProposals/${proposalOffset}/`)
        .then(response => response.json())
        .catch(() => {
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading. Try again later.</h4></div>`);
        })
        .then(results => {
            loadProposalsIntoSection(results);
        });
}
function exploreTopics(){
    fetch(`/loadExplore/${topicOffset}/4/0/`)
        .then(response => response.json())
        .catch(() => {
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading. Try again later.</h4></div>`);
        })
        .then(results => {
            loadExplore(results);
        });
}
function like(post_id) {
    var target = event.target;
    if(target.localName == "a") {
        target = target.firstChild;
    }
    if(target.src.split("/").pop() == "heart.svg") {
        target.src = "../../../icons/heartFull.svg"; 
        target.parentElement.lastChild.innerHTML = +target.parentElement.lastChild.innerHTML + 1;
    } else {
        target.src = "../../../icons/heart.svg";
        target.parentElement.lastChild.innerHTML = +target.parentElement.lastChild.innerHTML - 1;
    }
    fetch(`/like/${post_id}`)
        .then(response => response.json())
        .then(results => {
            switch(results) {
                case 0: 
                    console.log(0);
                    flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Post liked/unliked.</h4></div>`);
                    break;
                case 1:
                    console.log(1);
                    if(target.src.split("/").pop() == "heart.svg") {
                        target.src = "../../../icons/heartFull.svg"; 
                        target.parentElement.lastChild.innerHTML = +target.parentElement.lastChild.innerHTML + 1;
                    } else {
                        target.src = "../../../icons/heart.svg";
                        target.parentElement.lastChild.innerHTML = +target.parentElement.lastChild.innerHTML - 1;
                    }
                    flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while liking/unliking. Try again later.</h4></div>`);
                    break;
                case 2:
                    console.log(2);
                    if(target.src.split("/").pop() == "heart.svg") {
                        target.src = "../../../icons/heartFull.svg"; 
                        target.parentElement.lastChild.innerHTML = +target.parentElement.lastChild.innerHTML + 1;
                    } else {
                        target.src = "../../../icons/heart.svg";
                        target.parentElement.lastChild.innerHTML = +target.parentElement.lastChild.innerHTML - 1;
                    }
                    flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Your login has expired. Please log in again.</h4></div>`);
                    break;
            }
        })
        .catch(() => {
            if(target.src.split("/").pop() == "heart.svg") {
                target.src = "../../../icons/heartFull.svg"; 
                target.parentElement.lastChild.innerHTML = +target.parentElement.lastChild.innerHTML + 1;
            } else {
                target.src = "../../../icons/heart.svg";
                target.parentElement.lastChild.innerHTML = +target.parentElement.lastChild.innerHTML - 1;
            }
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred. Try again later.</h4></div>`);
        });
}
function saveNotes(){
    // Pull notes from textarea
    var note = document.querySelector(".notes textarea").value;  
    document.body.innerHTML += `<form id="jsForm" action="/notes/${note}" method="GET"><input type="hidden" name="a" value="a"></form>`;
    document.getElementById("jsForm").submit();
}
function deleteActivity() {
    document.body.innerHTML += `<form id="jsForm" action="/deleteActivity" method="GET"><input type="hidden" name="a" value="a"></form>`;
    document.getElementById("jsForm").submit();
}

// Bring up a popup
function report(post_id){
    document.querySelector('body').insertAdjacentHTML('beforeend', `
        <div class="report cancel">
            <h2>Submit the form below to report.</h2>
            <form action="../../../auth/report/${post_id}/${encodeURIComponent(window.location.href)}" method="POST">
                <h2 style="color: var(--text);">In short describe what is wrong with he post/reply or what it violates.</h2>
                <textarea type="text" id="message" name="message" minlength="15" maxlength="300" rows="2" required></textarea>
                <div class="tra">
                    <h3>Enter</h3>
                    <input type="text" id="tra" name="tra" value=" ">
                </div>
                <button class="user-input-btn" type="submit">Submit</button>
            </form>
        </div><div class="shade cancel" onclick="cancel()"></div>
    `);
}
function reportTopic(topic_id){
    document.querySelector('body').insertAdjacentHTML('beforeend', `
        <div class="report cancel">
            <h2>Submit the form below to report.</h2>
            <form action="../../../auth/reportTopic/${topic_id}/${encodeURIComponent(window.location.href)}" method="POST">
                <h2 style="color: var(--text);">In short describe what is wrong with he topic or what it violates.</h2>
                <textarea type="text" id="message" name="message" minlength="15" maxlength="300" rows="2" required></textarea>
                <div class="tra">
                    <h3>Enter</h3>
                    <input type="text" id="tra" name="tra" value=" ">
                </div>
                <button class="user-input-btn" type="submit">Submit</button>
            </form>
        </div><div class="shade cancel" onclick="cancel()"></div>
    `);
}
function post() {
    fetch(`/username`)
        .then(response => response.json())
        .catch(() => {
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred.</h4></div>`);
        })
        .then(results => {
            if(results == 'login') {
                return flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Your login has expired. Please log in again.</h4></div>`);
            } else if(results == 'error') {
                return flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A server error has occurred.</h4></div>`);
            } else {
                document.querySelector('body').insertAdjacentHTML('beforeend', `
                    <div class="report cancel">
                        <form action="/auth/post" class="post_form" enctype="multipart/form-data" method="POST"> 
                        <h3 id="name">Name: 
                            <input id="username" value="${results}" type="text" name="username" required="required">
                        </h3>
            
                        <h3>Enter a title: </h3> 
                        <input id="title" type="text" name="title" value="Lazy scrooc.">
            
                        <h3>Choose a topic: </h3> 
                        <input id="cat" class="suggest" type="text" name="cat" required="required" autocomplete="off" >
                        <div class="suggest-pop-up">
                            <div class="suggest-box"></div>
                        </div>
            
                        <h3>Enter the content: </h3>  
                        <textarea id="con" name="con" required="required"></textarea>
                        <!-- 
                            <input id="con" type="text" name="con" required="required">
                        -->
            
                        <h3>Add a few tags: </h3>
                        <h6>Format them like this: jolly, joyful, joy</h6> 
                        <input id="tags" type="text" name="tags" required="required">
            
                        <!-- 
                            <h3>Add an image: </h3>
                            <input type="file" id="user_file" name="user_file">
            
                            <h3>Is it blurred / grotesque... ?</h3>
                            <h6>This doesn't have negative impact only adds a warning.</h6> 
                        -->
                        
                        <input id="check" name="check" type="checkbox" class="hidden_input">
                        <label for="check" class="sensitive post_label">
                            <img src="../icons/test/sensitive1.svg"/>
                        </label>
            
                        <input id="user_file" name="user_file" type="file" class="hidden_input">
                        <label for="user_file" class="post_label">
                            <img src="../icons/test/image.svg"/>
                            <img id="image_preview" alt=" ">
                        </label><br>
            
                        <div class="tra">
                            <h3>Enter</h3>
                            <input type="text" id="tra" name="tra" value=" ">
                        </div>
            
                        <button class="user-input-btn" type="submit">Post!</button>
                        <a class="topic-create" href="../../../createTopic"><button class="user-input-btn user-input-btn-right">Create a new topic!</button></a>
                    </form> 
                    </div><div class="shade cancel" onclick="cancel()"></div>
                `);
            
            }
        }
    );
}
function createTopic() {
    fetch(`/fetchLogin`)
        .then(response => response.json())
        .catch(() => {
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred.</h4></div>`);
        })
        .then(results => {
            if(results == 'false') {
                return flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Your login has expired. Please log in again.</h4></div>`);
            } else {
                document.querySelector('body').insertAdjacentHTML('beforeend', `
                    <div class="report cancel">
                        <form action="/auth/topic" enctype="multipart/form-data" method="POST"> 
                            <h3>Enter a desired topic name: </h3>
                            <input id="name" type="text" name="name" required="required">

                            <h3>What is it about ? </h3> 
                            <input id="about" type="text" name="about" required="required">

                            <h3>Enter some tags to describe it.</h3> 
                            <h6>Format them like this: jolly, joyful, joy</h6> 
                            <input id="tags" type="text" name="tags" required="required">

                            <!--<h3>Is it *local or global?</h3> 
                            <h6>* - for a specific area, group, city, country, language...<br> It will also get additional recommendations for users in the area.</h6>
                            <input type="radio" name="local" value="global" checked="checked"><div>Global</div><br>
                            <input type="radio" name="local" value="local"><div>Local</div>-->

                            <input id="user_file" name="user_file" type="file" class="hidden_input">
                            <label for="user_file" class="post_label">
                                <img src="../icons/test/image.svg"/>
                                <img id="image_preview" alt=" ">
                            </label><br>

                            <div class="tra">
                                <h3>Enter</h3>
                                <input tabindex="-1" type="text" id="tra" name="tra" value=" ">
                            </div>

                            <button class="user-input-btn" type="submit">Create!</button>
                        </form>
                        </div>
                    </div><div class="shade cancel" onclick="cancel()"></div>
                `);
            
            }
        }
    );
}
function cancel(){
    var cancel = document.querySelectorAll('.cancel');
    for (i = 0; i < cancel.length; i++) {
        cancel[i].remove();
    }
}
function warning(){
    document.querySelector('body').insertAdjacentHTML('beforeend', `
    <div class="report cancel">
        <h2>Read carefully before proceeding.</h2>
        <div style="hyphens: none">There is high chance you will encounter disturbing imagery, mature and inappropriate content here. 
        If you are under the age of 18 or would like to spare your eyeballs leave immediately.
        When moderating you will be directly responsible for what happens to
        the posts. This is why it is crucial to only ban posts that CLEARLY violate
        our terms of service and NOT on your own volition. Make sure you judge accurately
        and correctly as any mistakes could result in YOUR ban.<br><br>
        <h2>Instructions:</h2>
        1. Be familiar with our terms of service.<br>
        2. Take some time to carefully analyze each post. If provided check the username, title, description,
        audio files, images, videos, any external links, cryptic messages separately and combined.<br>
        3. Decide if it should be banned, not banned or pass it on if you aren't sure.<br>
        4. If you choose to ban the post write down why it should be banned in the textarea below.<br>
        <button class="user-input-btn" onclick="cancel()">I have read the prompt and understand the responsibility and risks</button></div>
    </div><div class="shade cancel"></div>`);
}
function editTopicTitle(topic_id) {
   fetch(`/editTopic/${topic_id}`)
        .then(response => response.json())
        .catch(() => {
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred.</h4></div>`);
        })
        .then(results => {
            var tags = "";
            if(results) {
                for (i = 0; i < results.results.length; i++) {
                    if(i == results.results.length-1)
                        tags += results.results[i].tag;
                    else
                        tags += results.results[i].tag + ", ";
                }
                document.querySelector('body').insertAdjacentHTML('beforeend', `
                <div class="report cancel">
                    <form action="/auth/updateTopic/${topic_id}" class="post_form" enctype="multipart/form-data" method="POST"> 
            
                        <h3>Edit the description: </h3>  
                        <textarea id="about" name="about" required="required">${results.results1[0].description}</textarea>
            
                        <h3>Edit the tags: </h3>
                        <input id="tags" type="text" name="tags" required="required" value="${tags}">
                         
                        <input id="user_file" name="user_file" type="file" class="hidden_input">
                        <label for="user_file" class="post_label">
                            <img src="../../icons/test/image.svg" tabindex="0" onclick="document.getElementById('user_file').click('a')">
                            <img id="image_preview" alt=" ">
                        </label><br>
            
                        <div class="tra">
                            <h3>Enter</h3>
                            <input tabindex="-1" type="text" id="tra" name="tra" value=" " tabindex="-1">
                        </div>
                        <button class="user-input-btn" type="submit">Make changes to the topic!</button>
                    </form> 
                </div><div class="shade cancel" onclick="cancel()"></div>
                `);
            }
        });
}
function supportMessage() {
    document.querySelector('body').insertAdjacentHTML('beforeend', `
    <div class="report cancel">
        <h2>This function is reserved for our supporters and the 1st month trial.</h2>
        <div style="hyphens: none">This is in order to keep the site running. If you have a few spare ADA, XMR, ONE... you are welcome to support us:
            <br><a href="/payment" class="user-input-btn">Go to the page</a><br><br>
            Everyone else can still have access to all the useful features, admin privileges... We hope to release it to everyone for free one day if we get more adoption =].
        </div>
    </div><div class="shade cancel" onclick="cancel()"></div>`);
}

// Load content
function loadIntoTable(results){
    if (!results || results.length == 0){
        var loadButton = document.getElementById('load');
        loadButton.innerHTML = "";
        loadButton.tabIndex = -1;
        return document.querySelector("div.search").insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">These are all the data.</h4></div>`);
    }
    else {
        var reslength = results.length;
        var html = "";
        var date;

        if(tableOffset == 0) {
            html += `<tr class="high1">`;
                html += `<th>Recorded on:</th>`;
                html += `<th>Total users:</th>`;
                html += `<th>Total posts:</th>`;
                html += `<th>Total replies:</th>`;
            html += `</tr>`;

            html += `<tr class="high1 high">`;
            date = new Date(results[0].date);
            date = date.getDate() + ". " + (date.getMonth()+1) + ". " + date.getFullYear();
                html += `<td>` + date + `</td>`;
                html += `<td>` + results[0].users + `</td>`;
                html += `<td>` + results[0].posts + `</td>`;
                html += `<td>` + results[0].replies + `</td>`;
            html += `</tr>`;

            html += `<tr class="high2">`;
                html += `<th>Total views:</th>`;
                html += `<th>Total likes:</th>`;
                // html += `<th>Total shares:</th>`;
                html += `<th>Total banned users:</th>`;
                html += `<th>Total blocked posts:</th>`;
            html += `</tr>`;

            html += `<tr class="high2 high">`;
                html += `<td>` + results[0].views + `</td>`;
                html += `<td>` + results[0].likes + `</td>`;
                // html += `<td>` + results[0].shares + `</td>`;
                html += `<td>` + results[0].banned + `</td>`;
                html += `<td>` + results[0].blocked + `</td>`;
            html += `</tr>`;

            document.querySelector('.main_table > tbody').insertAdjacentHTML('beforeend', JSON.parse(JSON.stringify(html)));
        }
        
        else {
            for(var a = 0; a < reslength; a++){
                date = new Date(results[a].date);
                date = date.getDate() + ". " + (date.getMonth()+1) + ". " + date.getFullYear();
                html += `<tr>`;
                    html += `<td>` + date + `</td>`;
                    html += `<td>` + results[a].users + `</td>`;
                    html += `<td>` + results[a].posts + `</td>`;
                    html += `<td>` + results[a].replies + `</td>`;
                    html += `<td>` + results[a].views + `</td>`;
                    html += `<td>` + results[a].likes + `</td>`;
                    // html += `<td>` + results[a].shares + `</td>`;
                    html += `<td>` + results[a].banned + `</td>`;
                    html += `<td>` + results[a].blocked + `</td>`;
                html += `</tr>`;
            }
            
            html += `<tr><th colspan="9">Records for 6 weeks at a time.</th></tr>`;

            document.querySelector('.second_table > tbody').insertAdjacentHTML('beforeend', JSON.parse(JSON.stringify(html)));
        }

        if(tableOffset == 0){
            tableOffset = 1;
            loadTable();
        }
        else
            tableOffset = tableOffset + reslength;
    }
}
function loadPostsIntoSection(results) {
    if (!results || results.length == 0) {
        var loadButton = document.getElementById('load-replies');
        if (!loadButton)
            loadButton = document.getElementById('load-posts');
        loadButton.innerHTML = "";
        loadButton.tabIndex = -1;
        document.querySelector("div.search").insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">These are all the posts.</h4></div>`);
        return;
    }
    else {
        var reslength = results.length;
        var html = "";

        // el worka
        var standard = results.filter(
            function (obj) {
               return obj.type == '0';
            });
        // 2x vmes
        var pop = results.filter(
            function (obj) {
                return obj.type == '1';
            });
        var popratio = 4;
        // 1x vmes med prvih nekej x
        var add = results.filter(
            function (obj) {
                return obj.type == '2';
            });
        var addratio = 6;
        var ratio = 1;
        var ratio_offset = 0;
        if(standard.length < 2) {
            popratio = 1;
        }
        else if (standard.length < 4) {
            popratio = 2;
        }

        for(var a = 0; a < reslength; a++) {
            // Potentially include category name
            //html += `<a href="location.href='./act/${results[a].cat_name}/${results[a].id}" >`;
            if(a!=0 && a%popratio == 0 && pop[a/popratio-1] != undefined) {
                results = pop;
                ratio = a/popratio-1;
                ratio_offset++;
                console.log('pop');
            } else if (a!=0 && a%addratio == 0 && add[a/addratio-1] != undefined) {
                results = add;
                ratio = a/addratio-1;
                ratio_offset++;
            } else {
                results = standard;
                ratio = a-ratio_offset;
                console.log('standard');
            }
            
            if(results[ratio] != undefined) {
                var paint = [];
                if(!results[ratio].reply || results[ratio].reply == 0) {
                    html += `<div class="post" tabindex="0" onclick="window.location='/act/${results[ratio].cat_name}/${results[ratio].id}';"`;
                        if(theme == 1) {
                            paint = generatePaint();
                            html += `style="background: ${paint[0]}; outline-color: ${paint[2]}"`;
                        }
                    html += `>`;
                }
                else {
                    html += `<div class="post" tabindex="0" onclick="window.location='/act/${results[ratio].cat_name}/${results[ratio].reply}/#reply';">`;
                    html += `<div class="content reply-profile" onclick="window.location='/act/${results[ratio].cat_name}/${results[ratio].reply}';">This is your response to some post . Click to see the original.</div>`;
                }
                if (results[ratio].delete) {
                    html += `<div class="delete" tabindex="0" onclick="event.stopPropagation();deletePost(${results[ratio].id})"`;
                        if(theme == 1) {
                            html += `style="border-color: ${paint[2]}"`;
                        }
                    html += `></div>`;
                }
                html += `<div class="meta">`;
                html += `<div class="op">` + results[ratio].username + `</div>`;
                html += `<div  class="date">` + timeAgo(results[ratio].time) + `</div>`;
                html += `</div>`;

                html += `<h2 class="post-title">` + results[ratio].title + `</h2>`;
                html += `<a href="../../../topic/${results[ratio].cat_name}" class="topic-title" `;
                if(theme == 1) {
                    html += `style="background: ${paint[2]};" `;
                }
                html += `><h2>` + results[ratio].cat_name + `</h2></a>`;
                html += `<div class="content">`;
                    html += `<p class="post-content">` + results[ratio].content + `</p>`;
                html += `</div>`;
    
                html += `<div class="attachment-container" onclick='event.stopPropagation();changeStyle()'>`;
                    if(results[ratio].audio == 0) {
                        if(results[ratio].blurred == 1)
                            html += `<img width="600" height="200" class="attachment topic_blurred" onclick="blur_mobile(this)" src="` + results[ratio].user_file + `" alt="` + results[ratio].user_file.substring(13).split('.')[0] + `" >`;
                        else
                            html += `<img width="600" height="200" class="attachment" src="` + results[ratio].user_file + `" alt="` + results[ratio].user_file.substring(13).split('.')[0] + `">`;
                    }
                    if (results[ratio].audio == 1) {
                        html += `<audio controls class="attachment"><source src="/` + results[ratio].user_file + `" type="audio/mpeg" alt="` + results[ratio].user_file.substring(13).split('.')[0] + `"></audio>`;
                    }
                html += `</div>`;
    
                html += `<div class="social" onclick='event.stopPropagation();' `;
                    if(theme == 1) {
                        html += `style="background: ${paint[1]}"`;
                    }
                html +=`>
                            <a class="social-icons" tabindex="0" href="javascript:void(0);"><div>${results[ratio].views}</div></a>
                            <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="like(${results[ratio].id})">`;
                    if(results[ratio].liked == true) {
                        html += `<img src="../../../icons/heartFull.svg" alt="like" width="28">`;
                    } else {
                        html += `<img src="../../../icons/heart.svg" alt="like" width="28">`;
                    }
                html += `<div>${results[ratio].likes}</div></img></a>
                            <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="window.location='/act/${results[ratio].cat_name}/${results[ratio].id}/#reply';"><img src="../../../icons/comment.svg" width="28" class="comment-icon" alt="comment" ><div>${results[ratio].replies}</div></img></a>
                            <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="copy(location.href+'./act/${results[ratio].cat_name}/${results[ratio].id}/')" ><img src="../../../icons/share.svg" width="28" class="share-icon" alt="copy link" ></IMG></a> 
                            <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="report(${results[ratio].id})" ><img src="../../../icons/report.svg" width="28" class="report-icon" alt="report"><div></div></img></a>
                        </div></div>`;
            }
            if(/mod/.test(window.location.href)){
                var modTest = document.querySelector(".topic-preview");
                if (!modTest) {
                    var modForm = document.getElementById('modForm');
                    modForm.action += results[0].id;
                }
            }
        }
        
        if(/topic/.test(window.location.href)){
            var desc = document.createElement('meta'); 
            desc.name = 'description'; 
            desc.content = results[0].description;
            document.head.appendChild(desc);
            var ogdesc = document.createElement('meta');
            ogdesc.name = "og:description";
            ogdesc.content = results[0].description;
            document.head.appendChild(ogdesc);
        }

        if(offset == 0)
            document.querySelector('.container:not(.browse-topic):not(.browse-topic):not(.browse-topic)').innerHTML = JSON.parse(JSON.stringify(html));
        else
            document.querySelector('.container:not(.browse-topic):not(.browse-topic)').insertAdjacentHTML('beforeend', JSON.parse(JSON.stringify(html)));
        
        offset = offset + reslength;
        pauseAudio();
    }
}
function loadIframeIntoSection(results) {
    var html = "";
    var tags = "";
    if(results) {
        for (i = 0; i < results.results1.length; i++) {
            if(i == results.results1.length-1)
                tags += results.results1[i].tag;
            else
                tags += results.results1[i].tag + ", ";
        }
       html = `<div class="post topic-preview">
                    <div>
                        <div class="message1">
                            <h4 class="message-text1"><div class="tags">${tags}</div></h4>
                        </div>
                        <div class="message">
                            <h4 class="message-text">${results.results[0].iframe}<i class="plus-icon inline-icon" onclick="join(${results.results[0].id})"></i></h4>
                        </div>
                        <div class="description">${results.results[0].description}</div>
                    </div>`;

        if(results.results[0].cat_blurred)
            html += `<div class="topic_image topic_blurred" onclick="blur_mobile(this)" style="background: linear-gradient(to right, white 5vw, transparent 15vw),url('${results.results[0].user_file}'),url('${results.results[0].user_file}');background-repeat: no-repeat;
                        background-position: center right;background-size: cover;"></div>
                    </div>`;
        else
            html += `<div class="topic_image" style="background: linear-gradient(to right, white 5vw, transparent 15vw),url('${results.results[0].user_file}'),url('${results.results[0].user_file}');background-repeat: no-repeat;
                        background-position: center right;background-size: cover;"></div>
                    </div>`;

        document.querySelector('.container:not(.browse-topic):not(.browse-topic)').insertAdjacentHTML('beforeend', JSON.parse(JSON.stringify(html)));
        offset = 1;
        getPosts(1);

        if(/mod/.test(window.location.href)){
            var modForm = document.getElementById('modForm');
            console.log(results.results[0].id);
            modForm.action += results.results[0].id + "/1";
        }
    } else {
        document.querySelector("div.search").insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">There are no more posts to judge =></h4></div>`);
    }
}
function loadTopicsIntoSection(results){
    if (!results || results.length == 0){
        var loadButton = document.getElementById('load-topics');
        loadButton.innerHTML = "";
        loadButton.tabIndex = -1;
        document.querySelector("div.search").insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">These are all the topics.</h4></div>`);
        return;
    }
    else {
        var reslength = results.length;
        var html = "";
        for(var a = 0; a < reslength; a++){
            html += `<div class="topic ${results[a].cat_name}" tabindex="0" onclick="window.location='/topic/${results[a].cat_name}/';">`;
            if(results[a].cat_blurred == 1)
                html += `<div class="topics-background topics_blurred" style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 28%, rgba(0, 0, 0, 0) 78%), url('${results[a].user_file}');"></div>`;
            else 
                html += `<div class="topics-background" style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0) 35%), url('${results[a].user_file}');"></div>`;
            // html += `<div class="topic ${results[a].cat_name}" tabindex="0" style="background: linear-gradient(to bottom, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0) 45%, rgba(0, 0, 0, 0) 35%), url('${results[a].user_file}');" onclick="window.location='/topic/${results[a].cat_name}/';">`;
            html += `<h2 class="post-title">` + results[a].cat_name + `</h2>`;
            html += `<div class="content">${results[a].members} `;
            html += results[a].members < 2 ? `member` : `members`;
            html += `</div></div>`;
        }

        if(topicOffset == 0)
            document.querySelector('.topics-container').innerHTML = JSON.parse(JSON.stringify(html));
        else
            document.querySelector('.topics-container').insertAdjacentHTML('beforeend', JSON.parse(JSON.stringify(html)));

        topicOffset = topicOffset + reslength;
    }
}
function loadProposalsIntoSection(results){
    if (!results || results.length < 1){
        var loadButton = document.getElementById('load-proposals');
        loadButton.innerHTML = "";
        loadButton.tabIndex = -1;
        return document.querySelector("div.search").insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">These are all the proposals.</h4></div>`);
    } else {
        var reslength = results.length;
        var html = `<div class="proposals">`;

        for(var a = 0; a < reslength; a++){
            if(results[a].approved) {
                html +=`<h2 class="proposal-title"><i class="check-icon" tabindex="0"></i><div>${results[a].proposal}</div></h2>`;
            } else {
                html +=`<h2 class="proposal-title"><i class="cross-icon" tabindex="0"></i><div>${results[a].proposal}</div></h2>`;
            }
        }
        html += '</div>';

        document.querySelector('.proposals-container').insertAdjacentHTML('beforeend', JSON.parse(JSON.stringify(html)));
        proposalOffset = proposalOffset + reslength;

        var thisDiv, divWidth, divHeight, overlap;
        // collect all the divs
        var divs = document.querySelectorAll('.proposals > .proposal-title');
        // get window width and height
        var winWidth = document.querySelector('.proposals').offsetWidth;
        var winHeight = document.querySelector('.proposals').offsetHeight/Math.ceil(proposalOffset/12);
        for ( var a = proposalOffset - reslength, ti = 0, hightOffset = 0, widthOffset = 0, randomTop = 0, randomLeft = 0; a < divs.length; a++ ) {
            // shortcut! the current div in the list
            thisDiv = divs[i];
            divWidth = thisDiv.offsetWidth;
            divHeight = thisDiv.offsetHeight;

            overlap = true;
            ti = a+1;
            hightOffset = winHeight-divHeight;
            widthOffset = winWidth-divWidth;
            console.log(hightOffset);

            randomTop = getRandomNumber((24 + hightOffset)/4, (hightOffset-22)/8);
            if(ti%2 == 0)
                randomLeft = getRandomNumber(0, widthOffset/2);
            else
                randomLeft = getRandomNumber(widthOffset/2, widthOffset);
            thisDiv.style.marginTop = randomTop + "px";
            thisDiv.style.marginLeft = randomLeft + "px";
        }
    }
}
function loadExplore(results){
    if (!results || results.length == 0){
        var loadButton = document.getElementById('load-topics');
        loadButton.innerHTML = "";
        loadButton.tabIndex = -1;
        document.querySelector("div.search").insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">These are all the topics.</h4></div>`);
        return;
    }
    else {
        var reslength = results.length;
        var html = "", html1 = "";

        for(var a = 0; a < reslength; a++){
            if(results[a].joined == 'true') {
                html +=`<h2 class="post-title"><div onclick="window.location='/topic/${results[a].cat_name}/';">${results[a].cat_name}</div>
                <i class="minus-icon" tabindex="0" onclick="join(${results[a].id});"></i></h2>`;
            }
        }
        
        for(var a = 0; a < reslength; a++){
            if(results[a].joined == 'false') {
                html1 +=` <h2 class="post-title"><div onclick="window.location='/topic/${results[a].cat_name}/';">${results[a].cat_name}</div>
                <i class="plus-icon" tabindex="0" onclick="join(${results[a].id});"></i></h2>`;
            } 
        }

        if(topicOffset == 0) {
            document.querySelector('.explore-top').innerHTML = JSON.parse(JSON.stringify(html));
            topicOffset = topicOffset + reslength;
            exploreTopics();
        } 
        else {
            document.querySelector('.explore-content').innerHTML = JSON.parse(JSON.stringify(html1));
            topicOffset = topicOffset + reslength;
        }

        var thisDiv, divWidth, divHeight, overlap;
        var ti = 0, hightOffset = 0, widthOffset = 0, randomTop = 0, randomLeft = 0;

        // collect all the divs
        var divs = document.querySelectorAll('div.explore-content > h2.post-title');
        // get window width and height
        var winWidth = document.querySelector('.explore').offsetWidth;
        var winHeight = document.querySelector('.explore').offsetHeight;

        for ( i = 0; i < divs.length; i++ ) {
            // shortcut! the current div in the list
            thisDiv = divs[i];
            divWidth = thisDiv.offsetWidth;
            divHeight = thisDiv.offsetHeight;
            overlap = true;
            ti = i+1;
            hightOffset = winHeight-divHeight;
            widthOffset = winWidth-divWidth;

            console.log((24 + hightOffset)*ti/4);
            randomTop = getRandomNumber((24 + hightOffset)*ti/8, (hightOffset-22)/8*ti);
            if(ti%2 == 0)
                randomLeft = getRandomNumber(0, widthOffset/2);
            else
                randomLeft = getRandomNumber(widthOffset/2, widthOffset);
            thisDiv.style.top = randomTop + "px";
            thisDiv.style.left = randomLeft + "px";
        }
    }
}
function loadUserData(data){
    data = JSON.parse(JSON.stringify(data));
    var insert = "", insert2 = "";

    try {
        insert = "<div>Username: " + data.results1[0].username + "</div>" + 
                    "<div>Email: " + data.results1[0].email + "</div>" + 
                    "<div>Password: " + data.results1[0].password + "</div>" +
                    "<div>Last payment date: " + data.results1[0].last_payment + "</div>" +
                    "<div>Sign up date: " + data.results1[0].date + "</div>";
        document.getElementById("pd1").insertAdjacentHTML("beforeend", insert);
    } catch (error) {
        insert = "<div>Username: An error occured.</div>" +
                    "<div>Email: An error occured.</div>" +
                    "<div>Password: An error occured.</div>" + 
                    "<div>Last payment date: An error occured.</div>" +
                    "<div>Sign up date: An error occured.</div>";

        document.getElementById("pd1").insertAdjacentHTML("beforeend", insert);
    }
    
    try {
        insert2 = "<div>Posts: " + data.results2[0].posts + "<div/>" +
                    "<div>Replies: " + data.results2[0].replies  + "<div/>" +
                    "<div>Likes: " + data.results2[0].likes  + "<div/>" + 
                    "<div>Reports submitted: " +data.results2[0]["reports made"]  + "<div/>";

        if(data.results2[0]["reports recived"] == null)
            insert2 += "<div>Reports recived: 0<div/>";
        else
            insert2 += "<div>Reports recived: " +data.results2[0]["reports recived"]  + "<div/>";
        insert2 +=  "<div>Ban warnings recived: " + data.results2[0]["ban strikes recived"]  + "<div/>";

        document.getElementById("pd2").insertAdjacentHTML("beforeend", insert2);
    } catch (error) {
        insert2 = "<div>Posts: /<div/><div>Replies: /<div/><div>Likes: /<div/><div>Reports submitted: /<div/><div>Replies recived: /<div/><div>Ban warnings recived: /<div/>";
        document.getElementById("pd2").insertAdjacentHTML("beforeend", insert2);
    }

    try {
        for (i = 0; i < data.results3.length; i++) {
            document.getElementById("pd3").insertAdjacentHTML("beforeend", "<div>" + data.results3[i].tag + "</div>");
        }
        if(data.results3.length < 1)
            document.getElementById("pd3").insertAdjacentHTML("beforeend", "<div>/</div>");
    } catch (error) {
        document.getElementById("pd3").insertAdjacentHTML("beforeend", "<div>/</div>");
    }

    try {
        for (i = 0; i < data.results4.length; i++) {
            document.getElementById("pd4").insertAdjacentHTML("beforeend", "<div>" + data.results4[i].proposal + "</div>");
        }
        if(data.results4.length < 1)
            document.getElementById("pd4").insertAdjacentHTML("beforeend", "<div>/</div>");
    } catch (error) {
        document.getElementById("pd4").insertAdjacentHTML("beforeend", "<div>/</div>");
    }

    try {
        for (i = 0; i < data.results5.length; i++) {
            document.getElementById("pd5").insertAdjacentHTML("beforeend", "<button><a href='/topic/" + data.results5[i].name + "'>" + data.results5[i].name + "</a></button><br>");
        }
        if(data.results5.length < 1)
            document.getElementById("pd5").insertAdjacentHTML("beforeend", "<div>/</div>");
    } catch (error) {
        document.getElementById("pd5").insertAdjacentHTML("beforeend", "<div>/</div>");
    }

    try {
        for (i = 0; i < data.results6.length; i++) {
            document.getElementById("pd6").insertAdjacentHTML("beforeend", "<button><a href='/topic/" + data.results6[i].name + "'>" + data.results6[i].name + "</a></button><br>");
        }
        if(data.results6.length < 1)
            document.getElementById("pd6").insertAdjacentHTML("beforeend", "<div>/</div>");
    } catch (error) {
        document.getElementById("pd6").insertAdjacentHTML("beforeend", "<div>/</div>");
    }

    try {
        for (i = 0; i < data.results7.length; i++) {
            if(data.results7[i].reply == 0)
                document.getElementById("pd7").insertAdjacentHTML("beforeend", "<button><a href='/act/null/" + data.results7[i].id + "'>" + data.results7[i].title + "</a></button><br>");
            else 
                document.getElementById("pd7").insertAdjacentHTML("beforeend", "<button><a href='/act/null/" + data.results7[i].reply + "/#" + data.results7[i].id + "'>Reply to some post</a></button><br>");
        }
        if(data.results7.length < 1)
            document.getElementById("pd7").insertAdjacentHTML("beforeend", "<div>/</div>");
    } catch (error) {
        document.getElementById("pd7").insertAdjacentHTML("beforeend", "<div>/</div>");
    }
} 

function loadReplies(results){
    var html = '';
    if (!results || results.length == 0){
        var loadButton = document.getElementById('load-replies');
        loadButton.innerHTML = "";
        loadButton.tabIndex = -1;
        document.querySelector("div.search").insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">These are all the replies.</h4></div>`);
    } else {
        var reslength = results.length;
        var paint = [];
        
        for(var a = 0; a < reslength; a++){
                html += `<div class="reply post" id="${results[a].id}"`;
                if(theme == 1) {
                    paint = generatePaint(15);
                    html += `style="background: ${paint[0]}; outline-color: ${paint[2]}"`;
                }
                html += `>`;
                    html += `<div class="meta">`;
                        html += `<div class="op" onclick="tag('` + results[a].username + `')">` + results[a].username + `</div>`;
                        html += `<div class="date">` + timeAgo(results[a].time) + `</div>`;
                    html += `</div>`;
    
                html +=`<h3 class="post-title">` + results[a].title + `</h3>`; // nared tag/mention
                html += `<div class="content">`;
                    html += `<p class="post-content">` + results[a].content + `</p>`;
                html += `</div>`;
    
                /*html += `<div class="attachment-container">`;
                    if(results[a].audio == 0) {
                        html += `<img class="attachment" src="` + results[a].user_file + `" >`;
                    }
                    if (results[a].audio == 1){
                        html += `<audio controls class="attachment"><source src="` + results[a].user_file + `" type="audio/mpeg"></audio>`;
                    }
                html += `</div>`;*/
                // later?
    
                html += `<div class="social" onclick='event.stopPropagation();'`;
                if(theme == 1) {
                    html += `style="background: ${paint[1]}"`;
                }
                html += `>
                            <a class="social-icons" ><div>${results[a].views}</div></a>
                            <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="like(${results[a].id})"><img src="../../../icons/heart.svg" width="28" alt="like"><div>${results[a].likes}</div></img></a>
                            <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="replyTo(${results[a].id})"><img src="../../../icons/comment.svg" width="28" class="comment-icon" alt="comment" ><div>${results[a].replies}</div></img></a>
                            <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="copy('${location.href}#${results[a].id}')" ><img src="../../../icons/share.svg" width="28" class="share-icon" alt="copy link" ></IMG></a>
                            <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="report(${results[a].id})" ><img src="../../../icons/report.svg" width="28" class="report-icon" alt="report"><div></div></img></a>
                            <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="tag('${results[a].username}')" ><img src="../../../icons/at.svg" width="28" class="tag-icon" alt="report"><div></div></img></a>
                        </div></div>`;
            }
        document.querySelector('.all-reply-container').insertAdjacentHTML('beforeend', JSON.parse(JSON.stringify(html)));
        replyOffset = replyOffset + reslength;
    } 
}
function loadAct(results){
    if (!results || results.length == 0){
        var loadButton = document.getElementById('load-replies');
        loadButton.innerHTML = "";
        loadButton.tabIndex = -1;
        document.querySelector("div.search").insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">That's all that can be loaded.</h4></div>`);
        return;
    }
    else {
        // Add dynamic meta
        document.title = results[0].title + " on scrooc.";
        var paint = [];

        var ogtitle = document.createElement('meta');
            ogtitle.name = "og:title";
            ogtitle.content = results[0].title + " on scrooc.";
            document.head.appendChild(ogtitle);
        var meta = document.createElement('meta'); 
            meta.name = 'description'; 
            meta.content = results[0].content;
            document.head.appendChild(meta);
        var ogdesc = document.createElement('meta');
            ogdesc.name = "og:description";
            ogdesc.content = results[0].content;
            document.head.appendChild(ogdesc);
            

        fetch(`/loadKeywords/act/${results[0].id}`)
            .then(response => response.json())
            .catch(() => {
                flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading keywords. Try again later.</h4></div>`);
            })
            .then(results => {
                meta = document.createElement('meta'); 
                    meta.name = 'keywords';
                    for(i = 0; i < results.length; i++) {
                        if(i == results.length-1)
                            meta.content += results[i].tag;
                        else
                            meta.content += results[i].tag + ', ';
                    }
                    document.head.appendChild(meta);
            });

        var html = "";
        html += `<div class="post"`;
            if(theme == 1) {
                paint = generatePaint();
                html += `style="background: ${paint[0]}; outline-color: ${paint[2]}"`;
                document.getElementById("reply").style = `background-color: ${paint[0]};`;
            }
        html += `>`;

            if (results[0].delete) {
                html += `<div class="delete" tabindex="0" onclick="event.stopPropagation();deletePost(${results[0].id})"`
                    if(theme == 1) {
                        html += `style="border-color: ${paint[2]}"`;
                }
                html += `></div>`;
            }
    
            html += `<div class="meta">`;
                html += `<div class="op" onclick="tag('` + results[0].username + `')">` + results[0].username + `</div>`;
                html += `<div class="date">` + timeAgo(results[0].time) + `</div>`;
            html += `</div>`;
        html += `<h1 class="post-title">` + results[0].title + `</h1>`;

        // test
        html += `<a href="../../../topic/${results[0].cat_name}" class="topic-title" `;
                if(theme == 1) {
                    html += `style="background: ${paint[2]};" `;
                }
                html += `><h2>` + results[0].cat_name + `</h2></a>`;

        html += `<div class="content">`;
            html += `<p class="post-content">` + results[0].content + `</p>`;
        html += `</div>`;

        html += `<div class="attachment-container">`;
            if(results[0].audio == 0) {
                var ogimage = document.createElement('meta');
                ogimage.name = "og:image";
                ogimage.content = results[0].user_file;
                document.head.appendChild(ogimage);
                var ogimagealt = document.createElement('meta');
                ogimagealt.name = "og:image:alt";
                ogimagealt.content = (results[0].user_file.substring(27)).replace(/.jpg.webp|.png.webp|.jpeg.webp|.gif/, "");
                document.head.appendChild(ogimagealt);
                html += `<img width="600" height="200" class="attachment" onclick='changeStyle()' src="` + results[0].user_file + `" alt="` + results[0].user_file.substring(13).split('.')[0] + `">`;
            }
            if (results[0].audio == 1){
                var ogaudio = document.createElement('meta');
                ogaudio.name = "og:audio";
                ogaudio.content = results[0].user_file;
                document.head.appendChild(ogaudio);
                html += `<audio controls class="attachment"><source src="/` + results[0].user_file + `" type="audio/mpeg" alt="` + results[0].user_file.substring(13).split('.')[0] + `"></audio>`;
            }
        html += `</div><div class="social"`;
            if(theme == 1) {
                html += `style="background: ${paint[1]}"`;
            }
        html += `  ><a class="social-icons"><div>${results[0].views}</div></a>
                    <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="like(${results[0].id})">`;

            if(results[0].liked == true) {
                html += `<img src="../../../icons/heartFull.svg" alt="like" width="28">`;
            } else {
                html += `<img src="../../../icons/heart.svg" alt="like" width="28">`;
            }

        html += `<div>${results[0].likes}</div></img></a>
                    <a class="social-icons" tabindex="0" href="javascript:void(0);" href="${location.href}#reply"><img src="../../../icons/comment.svg" width="28" class="comment-icon" alt="comment" ><div>${results[0].replies}</div></img></a>
                    <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="copy(location.href)" ><img src="../../../icons/share.svg" width="28" class="share-icon" alt="copy link" ></IMG></a>
                    <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="report(${results[0].id})" ><img src="../../../icons/report.svg" width="28" class="report-icon" alt="report"><div></div></img></a>
                    <a class="social-icons" tabindex="0" href="javascript:void(0);" onclick="tag('${results[0].username}')" ><img src="../../../icons/at.svg" width="28" class="tag-icon" alt="report"><div></div></img></a>
                </div></div>`;
        
        document.querySelector('.container:not(.browse-topic):not(.browse-topic)').innerHTML = JSON.parse(JSON.stringify(html));
        
        /*
        document.querySelector('.save-offline').addEventListener('click', e => {
            e.preventDefault(); 
            const id = this.innerText; 
            var req = '/act/Scrooc/' + id;
            caches.open(offlineCacheName).then(cache => { 
              return cache.match(req).then(function(result) {
                if(!result) {
                  fetch(req).then(fetchRes => {
                    return cache.put(req, fetchRes);
                    // return limitCacheSize(offlineCacheName, dynamicCacheLimit);
                  });
                }
              });
            }); 
        });
        */
    }
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

// Copy to clipboard 2021 aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
function copy(link) {
    flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Copied.</h4></div>`);
    navigator.clipboard.writeText(link);
}
// @ ppl
function tag(username) {
    flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Tagged ${username}.</h4></div>`);
    document.getElementById("tag").value = username;
}

// Join topic
function join(topic_id) {
    var topic_name = window.location.href;
    if(/\/topic/.test(topic_name))
        topic_name = topic_name.substring(topic_name.indexOf("topic/") + 6).replace('/', '');
    else 
        topic_name = "";

    document.body.innerHTML += `<form id="jsForm" action="/topicJoin/${topic_id}/${topic_name}" method="GET"><input type="hidden" name="a" value="a"></form>`;
    document.getElementById("jsForm").submit();
}
// Delete post
function deletePost(post_id) {
    document.body.innerHTML += `<form id="jsForm" action="/deletePost/${post_id}" method="GET"><input type="hidden" name="a" value="a"></form>`;
    document.getElementById("jsForm").submit();
}
// Read notification
function read(e, notification_id) {
    e.preventDefault();
    try {
        var phref = new URL(e.target.parentElement.href);
    } catch (error) {
        var phref = new URL(e.target.parentElement.parentElement.href);
    }
    fetch(`/read/${notification_id}/`)
        .then(response => response.json())
        .then(results => {
            if(results)
                location.href = phref;
        })
}

// Tag commenter
function replyTo(id){
    var tag = document.getElementById('tag');
    tag.value = id;
    const tag4scrool = tag.getBoundingClientRect().top + window.pageYOffset - 300;
    window.scrollTo({top: tag4scrool});
}

// Assume how long ago a post was made
var timeAgo = function(date) {
    if (typeof date !== 'object') {
      date = new Date(date);
    }
  
    var seconds = Math.floor((new Date() - date) / 1000);
    var intervalType;
  
    var interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
      intervalType = 'year';
    } else {
      interval = Math.floor(seconds / 2592000);
      if (interval >= 1) {
        intervalType = 'month';
      } else {
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) {
          intervalType = 'day';
        } else {
          interval = Math.floor(seconds / 3600);
          if (interval >= 1) {
            intervalType = "hour";
          } else {
            interval = Math.floor(seconds / 60);
            if (interval >= 1) {
              intervalType = "minute";
            } else {
              interval = seconds;
              intervalType = "second";
            }
          }
        }
      }
    }
  
    if (interval > 1 || interval === 0) {
      intervalType += 's';
    }
  
    return interval + ' ' + intervalType + ' ago';
};

// Toggle visibility of dropdown menu
function drop() {
    document.getElementById("dropdown-content").classList.toggle("show");
	document.getElementById("mobile-dropdown-content").classList.toggle("show");
}

// Focus mode
function blur1() {
    counter++;
    var blur = "";
    if(counter%2 != 0)
        blur = "blur(0.2em)";
    var focus = document.querySelectorAll("div.op, .social-icons > div, .drop-btn");
    for (i = 0; i < focus.length; i++) {
        focus[i].style.filter = blur;
    }
}

// Pause audio on scroll by
function pauseAudio() {
    var audio = document.querySelectorAll("audio");
    audio.forEach((audio) => {
        var observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (
                        entry.intersectionRatio !== 1 &&
                        !audio.paused
                    ) {
                        audio.pause();
                    }
                });
            },
            { rootMargin: '50%' },
            { threshold: 1 }
        );
        observer.observe(audio);
    });
}