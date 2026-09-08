require("dotenv").config();
import nodemailer from "nodemailer";
import { reviews } from "@/constants";
import { requireAdminSession } from "@/lib/auth-helpers";

const transporter = nodemailer.createTransport({
    service: "gmail", // or your preferred email service
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export async function POST(req) {
    // SECURITY FIX: this endpoint previously had no authentication at all,
    // so anyone could POST arbitrary HTML + a subject line and have this
    // server relay it, from the organization's own Gmail account, to any
    // list of email addresses -- a mail-relay / phishing abuse vector.
    const authResult = await requireAdminSession();
    if ("error" in authResult) {
        return new Response(
            JSON.stringify({ error: authResult.error }),
            { status: authResult.status }
        );
    }

    const { recipients, payloadData } = await req.json();

    if (!recipients || recipients.length === 0) {
        return new Response(
            JSON.stringify({ error: "No recipients provided" }),
            { status: 400 }
        );
    }

    if (!payloadData?.subject || !payloadData?.body) {
        return new Response(
            JSON.stringify({ error: "Email subject and body are required" }),
            { status: 400 }
        );
    }

    try {
        for (const recipient of recipients) {
            let depart = recipient.Department;
            if (depart === "Video Editing") {
                depart = "Photography";
            }
            const dept = reviews.find((item) => item.name === depart);

            // BUG FIX: `dept` can legitimately be undefined (department name
            // changed in constants/index.js, or a malformed applicant
            // record) which previously threw on `dept.name` and aborted the
            // whole batch send after already emailing earlier recipients,
            // with no indication of which recipients were skipped.
            let deptName = dept?.name ?? depart ?? "your department";

            if (
                deptName === "Web Development" ||
                deptName === "App Development"
            ) {
                deptName = "Development Department";
            }

            if (deptName === "Photography" || deptName === "Video Editing") {
                deptName = "Photography & Video Editing Department";
            }

            let generalTemp = `
                <div>
                    ${payloadData.body}
                </div>
                `;

            generalTemp = generalTemp.replace(/#name/g, recipient.Name ?? "");
            generalTemp = generalTemp.replace(/#dept/g, deptName);

            const mailOptions = {
                from: process.env.EMAIL_USERNAME,
                to: recipient.Email,
                subject: payloadData.subject,
                html: generalTemp,
            };

            await transporter.sendMail(mailOptions);
        }

        return new Response(
            JSON.stringify({ message: "Emails sent successfully" }),
            { status: 200 }
        );
    } catch (error) {
        console.error("Error sending emails:", error);
        return new Response(
            JSON.stringify({ error: "Failed to send emails" }),
            { status: 500 }
        );
    }
}
