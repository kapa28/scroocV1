// Hide header on on scroll down
var flash = document.querySelector(".flash-container");
var didScroll;
var lastScrollTop = 0;
var delta = 5;

// Listen for scrolling
window.addEventListener('scroll', function() {
    didScroll = true;
});
window.addEventListener('touchmove', function() {
    didScroll = true;
});
setInterval(function() {
    if (didScroll) {
        hasScrolled();
        didScroll = false;
    }
}, 250);

// Hide if scrolling is detected
function hasScrolled() {
    var st = document.documentElement.scrollTop;
    
    // Make sure they scroll more than delta
    if(Math.abs(lastScrollTop - st) <= delta)
        return;
    
    // If they scrolled down and are past the navbar, add class .nav-up.
    if (st > lastScrollTop && st > document.querySelector(".search").offsetHeight -500){
        // Scroll Down
        document.querySelector(".search").classList.remove('search-visible');
        document.querySelector(".search").classList.add('search-hidden');
    } else {
        // Scroll Up
        if(st + window.innerHeight < document.querySelector("body").offsetHeight) {
            document.querySelector(".search").classList.remove('search-hidden');
            document.querySelector(".search").classList.add('search-visible');
        }
    }
    lastScrollTop = st;
}

document.addEventListener('animationstart', e => { 
    if (document.querySelector('h4.flash-message-text') != null) {
        document.querySelector(".search").classList.remove('search-hidden');
        document.querySelector(".search").classList.add('search-visible');
    }
});

// Fixes ugly tab
document.addEventListener('keydown', e => {
    if (e.keyCode === 9) { // Tab key
        document.documentElement.classList.add('keyboard-focus');
    } else {
        document.documentElement.classList.remove('keyboard-focus');
    }

    if(e.keyCode === 13) { 
        var temp = "";
        if(!e.target.getAttribute("onclick"))
            temp = e.target.getAttribute("onmousedown");
        else 
            temp = e.target.getAttribute("onclick");

        if(!temp || /\(\)/.test(temp))
            return;
        else if(/\(/.test(temp)){
            flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Consider it done.</h4></div>`);
            eval(temp);
        } else {
            window.open(((temp.substring(temp.indexOf("=") + 1)).replace(/\'/g, '')).replace(';', ''), "_self");
        }
    }
}, false);

document.addEventListener('contextmenu', e => {
    if(/post|topic|side-menu|search/.test(e.target.classList)){
        e.preventDefault();
        var temp = e.target.getAttribute("onclick");
        if(temp){
            if(/\(/.test(temp))
                flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Sorry you can't do that.</h4></div>`);
            else
                window.open(((temp.substring(temp.indexOf("=") + 1)).replace(/\'/g, '')).replace(';', ''), '_blank');    
        } else {
            temp = e.target.getAttribute("href");
            if(temp)
                window.open(((temp.substring(temp.indexOf("=") + 1)).replace(/\'/g, '')).replace(';', ''), '_blank');
        }
    }
});