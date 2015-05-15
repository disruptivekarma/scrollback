/* eslint-env browser */

"use strict";

module.exports = (core, config, store) => {
	const objUtils = require("../lib/obj-utils.js");

	let customStyle = {
		setCss: function(customCss) {
			if (typeof customCss !== "string") {
				return;
			}

			let roomObj = objUtils.clone(store.getRoom());

			if (!roomObj) {
				return;
			}

			if (!roomObj.guides) {
				roomObj.guides = {};
			}

			if (!roomObj.guides.customization) {
				roomObj.guides.customization = {};
			}

			roomObj.guides.customization.css = customCss;

			core.emit("room-up", { to: roomObj.id, room: roomObj });
		},

		removeCss: function() {
			let styleSheet = document.getElementById("scrollback-custom-css");

			if (styleSheet && document.head.contains(styleSheet)) {
				document.head.removeChild(styleSheet);
			}
		},

		applyCss: function() {
			this.removeCss();

			let roomObj = store.getRoom();

			if (!(roomObj && roomObj.guides && roomObj.guides.customization && roomObj.guides.customization.css)) {
				return;
			}

			let styleSheet = document.createElement("style");

			styleSheet.setAttribute("id", "scrollback-custom-css");

			styleSheet.appendChild(document.createTextNode("")); // fix webkit not recognizing styles

			document.head.appendChild(styleSheet);

			styleSheet.appendChild(document.createTextNode(roomObj.guides.customization.css.replace("<", "\\3c").replace(">", "\\3e")));
		}
	};

	core.on("statechange", changes => {
		let roomId = store.get("nav", "room");

		if ((changes.nav && ("room" in changes.nav || "mode" in changes.nav)) || (changes.entities && roomId in changes.entities)) {
			let mode = store.get("nav", "mode");

			if (mode === "room") {
				customStyle.applyCss();
			} else {
				customStyle.removeCss();
			}
		}
	}, 100);

	window.customStyle = customStyle;
};
