import { DM } from "./data.js";

export const UI = {

	timers: [],

	roomHeader: document.getElementById("room_header"),
	messageList: document.getElementById("room_message_list"),

	messageOptions: document.getElementById("message_options"),
	roomList: document.getElementById("room_list"),

	openRoomListButton: document.getElementById("open_room_list_button"),

	loginForm: document.getElementById("login_form"),
	loginButton: document.getElementById("login_button"),

	sendForm: document.getElementById("new_message_form"),

	async selectRoom(index) {
		await DM.selectRoom(index);
		this.messageList.innerHTML = "";

		//this.stopTimers();
		//this.startTimers();
		await DM.getMessages(false);

		const room = DM.getRoom();
		if (room) room.lastShownMessage = new Date(0);

		this.updateRooms();
		this.updateRoom(true);
		this.scrollToNew(false);
	},
	updateRoom(fullRedraw = false) {
		const room = DM.getRoom();
		if (!room) {
			this.roomHeader.innerHTML = "";
			this.messageList.innerHTML = "";

			return;
		}
		if (fullRedraw) {
			this.messageList.innerHTML = "";
			console.log(fullRedraw);
		}

		const autoScroll = this.CheckAutoScrollToNew();
		let newMessages = false;

		this.roomHeader.innerHTML = DM.roomHeaderEl(room);
		const container = document.createElement("div");

		if (!room.lastShownMessage) room.lastShownMessage = new Date(0);
		//messageList.innerHTML = "";
		for (let msg of room.messages) {
			if (room.lastShownMessage.getTime() >= new Date(msg.edited_at).getTime()) {
				continue;
			}

			const el = this.messageList.querySelector("#msg_" + msg._id);
			
			if (!msg.text) { el?.remove(); container.innerHTML = ""; continue; }
			container.innerHTML = DM.messageEl(msg);
			if (el) {
				el.innerHTML = container.querySelector("*").innerHTML;
				el.classList.add("unread");
			}
			else {
				container.querySelector("*").classList.add("unread");
				this.messageList.append(...container.childNodes);

				newMessages = true;
			}
			const msgEl = el ?? this.messageList.querySelector("#msg_" + msg._id);
			msgEl.onclick = () => {
				this.openMessageOptions(msg, msgEl);
				//this.setReply(msg);
			};

		}
		room.lastShownMessage = room.lastMessage;

		if (autoScroll && newMessages) this.scrollToNew();
	},
	updateRooms() {
		this.roomList.innerHTML = "";

		for (let index in DM.Rooms) {
			const room = DM.Rooms[index];
			this.roomList.innerHTML += DM.roomListEl(room);
		}
		for (let index in DM.Rooms) {
			const room = DM.Rooms[index];
			// const el = this.roomList.querySelector("#room_" + room._id);
			// if (el) {
			// 	container.innerHTML = DM.roomListEl(room);
			// 	el.innerHTML = container.querySelector("*").innerHTML;
			// }
			// else {

			//}
			const roomEl = document.getElementById("room_" + room._id);

			roomEl.onclick = () => {
				this.selectRoom(index);
				this.roomList.classList.remove("active"); // close the list if on narrow screen
			};

			if (index == DM.currentRoom) {
				roomEl.classList.add("active");
			}
		}
	},
	async updateUser() {
		const userIcon = document.getElementById("current_user_icon");
		userIcon.innerHTML = DM.userIconEl(DM.User);
		if (DM.User) {
			this.sendForm.classList.remove("inactive");
			this.sendForm.querySelector("fieldset").removeAttribute("disabled");
			this.loginButton.classList.add("hidden");
		}
		else {
			this.sendForm.classList.add("inactive");
			this.sendForm.querySelector("fieldset").setAttribute("disabled", true);
			this.loginButton.classList.remove("hidden");
		}
	},

	async login(body) {
		const result = await DM.login(body);
		if (result) {
			this.updateUser();
			this.selectRoom(0);

			this.loginForm.reset();
			this.loginForm.classList.add("hidden");
		}
	},
	async logout() {
		await DM.logout();

		this.updateUser();
		this.updateRooms();
		this.updateRoom();
	},

	async sendMessage(body) {
		await DM.sendMessage(body);
		await this.checkMessageUpdates();
		this.sendForm.reset();
		this.clearReply();
		this.scrollToNew();
	},
	async editMessage(body) {
		await DM.editMessage(body);
		await this.checkMessageUpdates();
		this.sendForm.reset();
		this.clearReply();
		this.scrollToNew();
	},
	async deleteMessage(body) {
		await DM.deleteMessage(body);
		await this.checkMessageUpdates();
		this.sendForm.reset();
		this.clearReply();
		this.scrollToNew();
	},

	openMessageOptions(msg, element) {
		this.messageOptions.classList.remove("hidden");
		let top = element.getBoundingClientRect().bottom - this.messageList.getBoundingClientRect().top;
		if (top + this.messageOptions.offsetHeight > this.messageList.offsetHeight) {
			top = element.getBoundingClientRect().top - this.messageList.getBoundingClientRect().top
				- this.messageOptions.offsetHeight;
		}
		this.messageOptions.style = `top: ${top}px;`;

		const reply = this.messageOptions.querySelector("#message_reply_button");
		reply.onclick = () => {
			this.setReply(msg);
			this.closeMessageOptions();
		};
		const editBtn = this.messageOptions.querySelector("#message_edit_button");
		const deleteBtn = this.messageOptions.querySelector("#message_delete_button");
		
		editBtn.setAttribute("disabled", "true");
		deleteBtn.setAttribute("disabled", "true");
		if (DM.User._id == msg.author._id) {
			editBtn.removeAttribute("disabled");
			editBtn.onclick = () => {
				this.setEdit(msg);
				this.sendForm.querySelector("[name='text']").value = msg.text;
				
				this.closeMessageOptions();
			};
			
			deleteBtn.removeAttribute("disabled");
			deleteBtn.onclick = () => {
				const res = confirm("Delete this message?");
				if (res) DM.deleteMessage(msg);
				
				this.closeMessageOptions();
			};
		}
		setTimeout(() => reply.focus(), 100);
	},
	closeMessageOptions() {
		this.messageOptions.classList.add("hidden");
	},


	setReply(msg) {
		this.sendForm.querySelector("[name='forwardOf']").value = msg._id;
		this.sendForm.classList.add("contains_reply");
		document.getElementById("new_message_forward").innerHTML = DM.messageEl(msg, 1);
	},
	clearReply() {
		this.sendForm.querySelector("[name='forwardOf']").value = "";
		this.sendForm.classList.remove("contains_reply");
		document.getElementById("new_message_forward").innerHTML = "";
		this.clearEdit();
	},

	setEdit(msg) {
		this.sendForm.querySelector("[name='editOf']").value = msg._id;
		this.sendForm.classList.add("contains_reply");
		document.getElementById("new_message_forward").innerHTML = DM.messageEl(msg, 1);
	},
	clearEdit() {
		this.sendForm.querySelector("[name='editOf']").value = "";
		this.sendForm.classList.remove("contains_reply");
		document.getElementById("new_message_forward").innerHTML = "";
	},

	openRoomList() {
		this.roomList.classList.toggle("active");
	},

	scrollToNew(smooth = true) {
		const msg = this.messageList.querySelector(":scope > .message:last-child");
		if (msg)
			msg.scrollIntoView(
				{ behavior: (smooth ? "smooth" : "auto"), block: "end" }
			);
		for (let msgEl of this.messageList.querySelectorAll(".message.unread")) {
			msgEl.classList.remove("unread");
		}
	},

	scrollCheck() {
		if (this.messageList.scrollHeight - this.messageList.scrollTop < this.messageList.offsetHeight + 20) {
			for (let msgEl of this.messageList.querySelectorAll(".message.unread")) {
				msgEl.classList.remove("unread");
			}
		}
	},

	/**
	 * Checks the current scroll position and determines if auto scroll to new messages is needed
	 */
	CheckAutoScrollToNew() {
		return (this.messageList.scrollHeight - this.messageList.scrollTop < this.messageList.offsetHeight + 60);
	},

	async checkMessageUpdates() {
		await DM.getMessages();
		this.updateRoom();
	},
	async checkRoomUpdates() {
		await DM.getRooms();
		this.updateRooms();
		this.updateRoom();
	},

	startTimers() {
		this.stopTimers();
		if (!DM.User) return;
		this.checkMessageUpdates();
		// for now, will replace with sockets:
		let tid = setInterval(() => this.checkMessageUpdates(), 2000);
		this.timers.push(tid);
		//timers.push(setInterval(() => checkRoomUpdates(), 5000));
	},
	stopTimers() {
		for (let t of this.timers) {
			clearInterval(t);
		}
		this.timers.splice(0, this.timers.length);
	}
};
// export {
// 	loginForm, loginButton, sendForm, updateRoom,
// 	updateUser, scrollToNew, startTimers, stopTimers, checkMessageUpdates, checkRoomUpdates,
// 	clearReply, setReply, roomHeader, messageList, selectRoom
// };