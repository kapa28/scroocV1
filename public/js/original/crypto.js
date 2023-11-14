var crypto_input = document.querySelector("input#crypto");
var amount_input = document.querySelector("#amount");
var conversion_input = document.querySelector("#conversion");
var min_amount = document.querySelector(".minimal-amount");
var flash = document.querySelector(".flash-container");
var notification = document.querySelector(".suggest-pop-up.s5");
var fiat_amount = "12";
var myHeaders = new Headers();
	myHeaders.append("x-api-key", "2J8N0CE-B4A4MW0-K4PGY4T-H8KF6JM");
var requestOptions = {
	method: 'GET',
	headers: myHeaders,
	redirect: 'follow'
};
var myHeaders2 = new Headers();
	myHeaders2.append("x-api-key", "2J8N0CE-B4A4MW0-K4PGY4T-H8KF6JM");
	myHeaders2.append("Content-Type", "application/json");
var requestOptions2 = "";
const baseURL = "https://scrooc.com";

fetch("https://api.nowpayments.io/v1/currencies", requestOptions)
	.then(response => response.json())
	.then(result => {
		var available_currencies = ``;
		for (var i = 0; i < result.currencies.length; i++) {
			available_currencies += `<li class="crypto" tabindex="0" onMouseDown="insertText1('${result.currencies[i]}');">${result.currencies[i]}</li>`;
		}
		document.querySelector(".crypto-options").insertAdjacentHTML("beforeend", available_currencies);
	})
	.catch(error => console.log('error', flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading keywords. Try again later.</h4></div>`))); 
conversion_input.value = fiat_amount;

// remove ?
window.history.replaceState(null, null, window.location.pathname);

// good
document.body.addEventListener('focusout', e => { 
	if (!notification.contains(e.relatedTarget)) {
		notification.classList.remove('show');;
	}
});
crypto_input.addEventListener('focusin', e => { 
	if (!notification.contains(e.relatedTarget)) {
		notification.classList.add('show');
	}
});
crypto_input.addEventListener('keydown', e => { 
	var cryptos = document.querySelectorAll(".crypto");

	if (e.keyCode == 27 || e.keyCode == 13) {
		notification.classList.remove('show');
	} else {
		notification.classList.add('show');
	}

	for (var i = 0; i < cryptos.length; i++) {
		if(!cryptos[i].innerHTML.includes(crypto_input.value)) {
			cryptos[i].style.display = "none";
		}
	}
	for (var i = 0; i < cryptos.length; i++) {
		if(cryptos[i].innerHTML.includes(crypto_input.value)) {
			cryptos[i].style.display = "block";
		}
	}
});

// Inseri
function insertText1(value1) {
	notification.style.display = "none";
	notification.style.pointerEvents = "none";
	crypto_input.value = value1;
	loadPreview();
}

function loadPreview() {
	var raw = "";

	fetch("https://api.nowpayments.io/v1/status", requestOptions)
		.then(response => response.json())
		.then(result => {
			if(result.message == "OK") {
				fetch("https://api.nowpayments.io/v1/min-amount?currency_from=" + crypto_input.value + "&currency_to=" + crypto_input.value + "&fiat_equivalent=usd", requestOptions)
				.then(response => response.json())
				.then(result => {
					min_amount.innerHTML = "The minimum payment for this crypto is " + result.min_amount + " " + crypto_input.value + " or close to " + result.fiat_equivalent.toFixed(2) + " in USD.";
					if(result.fiat_equivalent > parseFloat(fiat_amount)) {
						fiat_amount = result.fiat_equivalent*1.001;
					}

					fetch("https://api.nowpayments.io/v1/estimate?amount=" + fiat_amount + "&currency_from=usd&currency_to=" + crypto_input.value, requestOptions)
					.then(response => response.json())
					.then(result => {
						// + user_paymet_id + note
						amount_input.value = result.estimated_amount;
						fetch("/generateId")
							.then(response => response.json())
							.then(result1 => {
								var order_id = result1;
								raw = JSON.stringify({
									"price_amount": fiat_amount,
									"price_currency": "usd",
									"pay_currency": result.currency_to,
									"ipn_callback_url": baseURL + "/payment_notification/",
									"order_id": order_id
								});
								requestOptions2 = {
									method: 'POST',
									headers: myHeaders2,
									body: raw,
									redirect: 'follow'
								};
							})
							.catch(error => flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading keywords. Try again later.</h4></div>`));   
					})
					.catch(error => console.log('error', flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading keywords. Try again later.</h4></div>`)));  
				})
				.catch(error => console.log('error', flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading keywords. Try again later.</h4></div>`)));
			}
		})
		.catch(error => console.log('error', flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading keywords. Try again later.</h4></div>`)));   
}

function startPayment() {
	fetch("https://api.nowpayments.io/v1/payment", requestOptions2)
		.then(response => response.text())
		.then(result => {
			result = JSON.parse(result);
			if(result.code == "AMOUNT_MINIMAL_ERROR") {
				flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">The amount is too low for the selected cryptocurrency.</h4></div>`);
			} else {
				window.location.replace("/payment_invoice/" + result.payment_id);
			}
		})
		.catch(error => {
			flash.insertAdjacentHTML("beforeend", `<div class="flash-message"><h4 class="flash-message-text" style="animation: message-fade 5s;">A networking error has occurred while loading keywords. Try again later.</h4></div>`);
		});
}
