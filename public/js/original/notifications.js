var notification_container = document.querySelector(".notification-icon");
var flash = document.querySelector(".flash-container");
var notification = document.querySelector(".s4.s4");
var notification_popup = document.querySelector(".s4.notification");
var notification_offset = 0;

// remove ?
window.history.replaceState(null, null, window.location.pathname);
var first_click = true;

// Make search visible and invisible
document.body.addEventListener('focusout', e => { 
    if (!notification_popup.contains(e.relatedTarget)) {
		notification_popup.classList.remove('showb');
		first_click = true;
    }
});
// maybe tko?
notification_container.addEventListener('click', async function(e) { 
	if (first_click == false) {
		notification_popup.classList.remove('showb');
		first_click = true;
	} else {
		notification_popup.classList.add('showb');
		first_click = false;
		var data = "";
		await fetch(`/notifications/${notification_offset}`)
			.then(response => response.json())
			.then(results => {
				data = results;
			})
			.catch(() => {
				flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Failed to load your notifications. Try again later.</h4></div>`);
			});
		loadIn(data);
	}
});
notification_container.addEventListener('keypress', async function(e) { 
	if (first_click == false) {
		notification_popup.classList.remove('showb');
		first_click = true;
	} else {
		notification_popup.classList.add('showb');
		first_click = false;
		var data = "";
		await fetch(`/notifications/${notification_offset}`)
			.then(response => response.json())
			.then(results => {
				data = results;
			})
			.catch(() => {
				flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Failed to load your notifications. Try again later.</h4></div>`);
			});
		loadIn(data);
	}
});

function loadIn(data) {
	var html = "";
	if(data.length == 0) {
		return flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Your login has expired. Please log in again.</h4></div>`);
	}
		
	if(notification_offset == 0)
		notification.innerHTML = `<a onclick="return false;"><li>${data.results1[0].read} unread notifications.</li></a>`;
		for(var i = 0, message = ""; i < data.results.length; i++) {
			switch (data.results[i].type) {
				case 0:
					message = "Someone replied to your post:";
					break;
				case 1:
					message = `<div class="ban-message">Your account has been banned for violating our ToS or rules at least 3 times:</div>`;
					break;
				case 2:
					message = `<div class="ban-message">Your post has been removed for violating our ToS or rules. If this happens 2 more times your account will be suspended from posting.</div>`;
					break;
				case 3:
					message = `A message from Scrooc:`;
					break;
			}
			if(data.results[i].read == 1)
				html += `<a href="${data.results[i].href}" class="read" tabindex="1" onclick="return read(event, ${data.results[i].id});"><li>${message} <span>${data.results[i].notification}<span></li></a>`;
			else
				html += `<a href="${data.results[i].href}" tabindex="1" onclick="return read(event, ${data.results[i].id});"><li>${message} <span>${data.results[i].notification}<span></li></a>`;
		notification.insertAdjacentHTML('beforeend', html);
	}
}

notification_popup.addEventListener('scroll', async function(e) {
	if(notification_popup.scrollTop === (notification_popup.scrollHeight - notification_popup.offsetHeight)) {
		notification_offset = notification_offset + 8;
		var data = "";
		await fetch(`/notifications/${notification_offset}`)
			.then(response => response.json())
			.then(results => {
				data = results;
			})
			.catch(() => {
				flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">Failed to load your notifications. Try again later.</h4></div>`);
			});
		if(data.length < 1)
			notification_offset = notification_offset - 8;
		loadIn(data);
	}
});