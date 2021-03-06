import { Message } from "./message.model.js";


export const messageService = {
	async send(message) {
		const msg = new Message(message);

		return msg.save();
	},
	async getAll(roomId, fromDate = null) {
		return Message.find({
			room: roomId,
			edited_at: { $gt: new Date(fromDate || "2021-01-01"), $lte: new Date() }
		})
			.populate("author")
			.populate({ path: "forwardOf", populate: { path: "author" } })
			.sort({ sent_at: 1 })
			.lean();
	},
	async search(roomId, data) {
		const { text, author, fromDate, toDate } = data;
		let query = Message;
		if (text)
			query = query.find({ $text: { $search: String(text) } });

		if (author)
			query = query.where("author").equals(author);

		if (fromDate || toDate)
			query = query.where("edited_at").gte(fromDate ?? new Date("2021-01-01")).lte(toDate ?? new Date());

		return query
			.where("room").equals(roomId)
			.populate("author")
			.populate({ path: "forwardOf", populate: { path: "author" } })
			.sort({ sent_at: 1 })
			.lean();
	},
	async getOne(id) {
		return Message.findById(id)
			.populate("author")
			.populate("forwardOf")
			.lean();
	},
	async deleteOne(id) {
		return Message.findByIdAndUpdate(id, {text: "", forwardOf: null});
	},
	async getOneEditable(id) {
		return Message.findById(id).exec();
	}
};