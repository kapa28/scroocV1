//// Get all elements
var search = document.querySelector(".form");
var input = search.querySelector(".search-input");
var topic = document.querySelector(".autocomplete-box");
var flash = document.querySelector(".flash-container");
var message3 = document.querySelector(".message3");

// remove ?
window.history.replaceState(null, null, window.location.pathname);

// Make search visible and invisible
document.body.addEventListener('focusout', e => { 
	const enteringParent = !document.querySelector(".pop-up").contains(e.relatedTarget);
	if (enteringParent) {
		document.querySelector(".pop-up").classList.remove('show');
    }
});
document.getElementById('search').addEventListener('focusin', e => { 
	const enteringParent = !document.querySelector(".pop-up").contains(e.relatedTarget);
	if (enteringParent) {
		document.querySelector(".pop-up").classList.add('show');
    }
});
document.getElementById('search').addEventListener('keypress', e => { 
	if(e.code === "Enter") {
		SearchP();
	}
});

function SearchP() {
	var searchp = document.querySelector(".search-input").value; //input.value ne dela :(
	if (searchp.length > 2) {
		document.body.innerHTML += `<form id="jsForm" action="/sact/${searchp}" method="GET"><input type="hidden"></form>`;
		document.getElementById("jsForm").submit();
    }
}

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

// Check for entry
input.onkeyup = debounce(async (e) => {
	var userData = e.target.value.toLowerCase(); //enter value
	var data = '';
	var html = '';
	if(userData.length > 1) {
		await fetch(`/search/${userData}`)
			.then(response => response.json())
			.then(results => {
				data = results;
			})
			.catch(() => {
				flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Search results could not be loaded. Try again later.</h4></div>`);
			});
		html = "";
		if((data || []).length > 0){
			for(var i = 0; i < data.length; i++) {
				html += `<a href="/topic/${data[i].cat_name}"><li>${data[i].cat_name}</li></a>`;
				message3.innerHTML = "";
			}
			topic.innerHTML = html;
		}
		else {
			topic.innerHTML = html;
			message3.innerHTML = "Nothing found :(";
		}
	}
});