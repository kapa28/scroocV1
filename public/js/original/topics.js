var input = document.getElementById("topics");
var flash = document.querySelector(".flash-container");
var suggestion = document.querySelector(".suggest-box.s3");
var popup = document.querySelector(".suggest-pop-up.s3");

// remove ?
window.history.replaceState(null, null, window.location.pathname);

// Stop keytype spam
var delay = 500;
function debounce(cb) {
	var timeout;
	return (...args) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			cb(...args);
		}, delay)
	}
}

// Make search visible and invisible
document.body.addEventListener('focusout', e => { 
    if (!popup.contains(e.relatedTarget)) {
		popup.classList.remove('show');
    }
});
input.addEventListener('focusin', e => { 
    if (!popup.contains(e.relatedTarget)) {
		popup.classList.add('show');
    }
});

input.addEventListener('keypress', e => { 
	if(e.code === "Enter" || e.code === 8) {
		return false;
	}
});

// Check for entry
input.onkeyup = debounce(async (e) => {
	var userData = e.target.value.toLowerCase(); //enter value
	var data = '';
	var html = '';
	await fetch(`/search/ ${userData}/1`)
		.then(response => response.json())
		.then(results => {
			data = results;
		})
		.catch(() => {
			flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Search results could not be loaded. Try again later.</h4></div>`);
		});
	html = "";
	if((data || []).length > 0) {
		for(var i = 0; i < data.length; i++) {
			html += `<a href="/topic/${data[i].cat_name}"><li>${data[i].cat_name}</li></a>`;
		}
		suggestion.innerHTML = html;
	} else {
		suggestion.innerHTML = `<a href="../../../explore"><li>You aren't joined in any topics starting with that ;). Click to find them</li></a>`;
	}
});
input.onclick = async (e) => {
	var userData = e.target.value.toLowerCase(); //enter value
	var data = '';
	var html = '';
	await fetch(`/search/ ${userData}/1`)
		.then(response => response.json())
		.then(results => {
			data = results;
		})
		.catch(() => {
			flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Search results could not be loaded. Try again later.</h4></div>`);
		});
	html = "";
	if((data || []).length > 0) {
		for(var i = 0; i < data.length; i++) {
			html += `<a href="/topic/${data[i].cat_name}"><li>${data[i].cat_name}</li></a>`;
		}
		suggestion.innerHTML = html;
	} else {
		suggestion.innerHTML = `<a href="../../../explore"><li>You aren't joined in any topics starting with that ;). Click to find them</li></a>`;
	}
};

// If button click search through posts + new results page