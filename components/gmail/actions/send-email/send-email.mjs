/* eslint-disable pipedream/props-description */
import gmail from "../../gmail.app.mjs";
import constants from "../../common/constants.mjs";
import mime from "mime";

export default {
  key: "gmail-send-email",
  name: "Send Email",
  description: "Send an email from your Google Workspace email account",
  version: "0.0.8",
  type: "action",
  props: {
    gmail,
    to: {
      type: "string[]",
      label: "To",
      description: "Enter a single recipient's email or multiple emails as items in an array.",
    },
    cc: {
      type: "string[]",
      label: "Cc",
      optional: true,
      description: "Enter a single recipient's email or multiple emails as items in an array.",
    },
    bcc: {
      type: "string[]",
      label: "Bcc",
      optional: true,
      description: "Enter a single recipient's email or multiple emails as items in an array.",
    },
    fromName: {
      type: "string",
      label: "From Name",
      description: "Specify the name that will be displayed in the \"From\" section of the email.",
      optional: true,
    },
    replyTo: {
      type: "string",
      label: "Reply To",
      description: "Specify the email address that will appear on the \"Reply-To\" field, if different than the sender's email.",
      optional: true,
    },
    subject: {
      type: "string",
      label: "Subject",
      description: "Specify a subject for the email.",
    },
    body: {
      type: "any",
      label: "Email Body",
      description: "Include an email body as either plain text or HTML. If HTML, make sure to set the \"Body Type\" prop to `html`.",
    },
    bodyType: {
      type: "string",
      label: "Body Type",
      description: "Choose to send as plain text or HTML. Defaults to `plaintext`.",
      optional: true,
      default: "plaintext",
      options: Object.values(constants.BODY_TYPES),
    },
    attachments: {
      type: "object",
      label: "Attachments",
      description: "Add any attachments you'd like to include as objects. The `key` should be the **filename** and the `value` should be the **url** for the attachment. The **filename** must contain the file extension (i.e. `.jpeg`, `.txt`) and the **url** is the download link for the file.",
      optional: true,
    },
    inReplyTo: {
      type: "string",
      label: "In Reply To",
      description: "Specify the `message-id` this email is replying to. Must be from the first message sent in the thread. To use this prop with `async options` please use `Gmail (Developer App)` `Send Email` component.",
      optional: true,
    },
    mimeType: {
      type: "string",
      label: "Mime Type",
      description: "Mime Type of attachments. Setting the mime-type will override using the filename extension to determine attachment's content type.",
      optional: true,
      options() {
        return Object.values(mime._types);
      },
    },
  },
  async run({ $ }) {
    const {
      name: fromName,
      email,
    } = await this.gmail.userInfo();

    const opts = {
      from: this.fromName
        ? `${this.fromName} <${email}>`
        : `${fromName} <${email}>`,
      to: this.to,
      cc: this.cc,
      bcc: this.bcc,
      replyTo: this.replyTo,
      subject: this.subject,
    };

    if (this.inReplyTo) {
      try {
        const repliedMessage = await this.gmail.getMessage({
          id: this.inReplyTo,
        });
        const { value: subject } = repliedMessage.payload.headers.find(({ name }) => name === "Subject");
        //sometimes coming as 'Message-ID' and sometimes 'Message-Id'
        const { value: inReplyTo } = repliedMessage.payload.headers.find(({ name }) => name.toLowerCase() === "message-id");
        opts.subject = `Re: ${subject}`;
        opts.inReplyTo = inReplyTo;
        opts.references = inReplyTo;
        opts.threadId = repliedMessage.threadId;
      } catch (err) {
        opts.threadId = this.inReplyTo;
      }
    }

    if (this.attachments) {
      opts.attachments = Object.entries(this.attachments)
        .map(([
          filename,
          path,
        ]) => {
          const attachment = {
            filename,
            path,
          };
          if (this.mimeType) {
            attachment.contentType = this.mimeType;
          }
          return attachment;
        });
    }

    if (this.bodyType === constants.BODY_TYPES.HTML) {
      opts.html = this.body;
    } else {
      opts.text = this.body;
    }

    const response = await this.gmail.sendEmail(opts);
    $.export("$summary", `Successfully sent email to ${this.to}`);
    return response;
  },
};
