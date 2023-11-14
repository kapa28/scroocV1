// Get all elements
var suggest_search = document.querySelector(".post_form");
var suggest_input1 = suggest_search.querySelector(".suggest.s1");
var suggest_input2 = suggest_search.querySelector(".suggest.s2");
var suggestion1 = document.querySelector(".suggest-box.s1");
var suggestion2 = document.querySelector(".suggest-box.s2");
var popup1 = document.querySelector(".suggest-pop-up.s1");
var popup2 = document.querySelector(".suggest-pop-up.s2");

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

// Make search visible
try {
	document.body.addEventListener('focusout', e => { 
		if (!popup1.contains(e.relatedTarget)) {
			popup1.classList.remove('show');
		}
	});
	document.getElementById('cat').addEventListener('focusin', e => { 
		if (!popup1.contains(e.relatedTarget)) {
			popup1.classList.add('show');
		}
	});
	// Check for entry
	suggest_input1.onkeyup = debounce(async (e) => {
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
					flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred.  Try again later.</h4></div>`);
				});
			html = "";
			if((data || []).length > 0){
				for(var i = 0; i < data.length; i++)
				{
					html += `<li onMouseDown="insertText('${data[i].cat_name}')" tabindex="0">${data[i].cat_name}</li>`;
				}
				/*for(var i = 0; i < data.length; i++) {
					html += `<a href="/topic/${data[i].cat_name}"><li>${data[i].cat_name}</li></a>`;
				}*/
			}
			else {
				html = "<li>Nothing found :(</li>";
			}
		}
		suggestion1.innerHTML = html;
	});
} catch (error) {
	flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred.  Try again later.</h4></div>`);
}

try {
	document.body.addEventListener('focusout', e => { 
		if (!popup2.contains(e.relatedTarget)) {
			popup2.classList.remove('show');
		}
	});
	document.getElementById('tags').addEventListener('focusin', e => { 
		if (!popup2.contains(e.relatedTarget)) {
			popup2.classList.add('show');
		}
	});
	suggest_input2.onkeyup = debounce(async (e) => {
		var userData = (e.target.value.toLowerCase()).split(',').pop(); //enter value
		var data = '';
		var html = '';
		if(userData.length > 1) {
			await fetch(`/searchTags/${userData}`)
				.then(response => response.json())
				.then(results => {
					data = results;
				})
				.catch(() => {
					flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred.  Try again later.</h4></div>`);
				});
			html = "";
			if((data || []).length > 0) {
				for(var i = 0; i < data.length; i++)
				{
					html += ` <li onMouseDown="insertTags('${data[i].tag}')" tabindex="0">${data[i].tag}</li>`;
				}
			}
			else {
				html = "<li>Nothing found :(</li>";
			}
		}
		suggestion2.innerHTML = html;
	});
} catch (error) {
	flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred.  Try again later.</h4></div>`);
}

// Insert suggested
function insertText(topic) {
	document.querySelector("input#cat").value = topic;
}
function insertTags(tag) {
	var temp = document.querySelector("input#tags").value;
	temp = temp.substr(0, temp.lastIndexOf(",") + 1);
	document.querySelector("input#tags").value = temp + tag;
}