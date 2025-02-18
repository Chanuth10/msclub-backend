import { DocumentDefinition } from "mongoose";
import { IApplication, IInterview } from "../../interfaces";
import ApplicationModel from "../models/Application.model";
import { Request } from "express";
import axios from "axios";
import moment from "moment";

/**
 * Application Service
 * @param {IApplication} application
 * @returns {Promise<IApplication>}
 */
export const addApplication = async (request: Request, applicationData: DocumentDefinition<IApplication>) => {
	return await ApplicationModel.create(applicationData)
		.then(async (application) => {
			// Send email
			const emailTemplate = "Application-Email-Template.html";
			const to = application.email;
			const subject = "MS Club SLIIT - Application Received";
			const emailBodyData = {
				studentId: application.studentId,
				name: application.name,
				email: application.email,
				contactNumber: application.contactNumber,
				currentAcademicYear: application.currentAcademicYear,
				linkedIn: application.linkedIn,
				gitHub: application.gitHub,
				skillsAndTalents: application.skillsAndTalents,
			};

			const email = {
				template: emailTemplate,
				to: to,
				subject: subject,
				body: emailBodyData,
			};

			// Send email data to message queue
			const channel = request.channel;
			request.queue.publishMessage(channel, JSON.stringify(email));
			return application;
		})
		.catch((error) => {
			throw new Error(error.message);
		});
};

/**
  Application Service
 * @param applicationId @type string
 * @returns {Promise<IApplication>}
 */
export const fetchApplicationById = async (applicationId: string) => {
	return await ApplicationModel.findById(applicationId)
		.then((application) => {
			return application;
		})
		.catch((error) => {
			throw new Error(error.message);
		});
};

/**
 * Application Service
 * @param {FilterQuery<IApplication>} query
 * @returns {Promise<IApplication>}
 */
export const fetchApplications = async () => {
	return await ApplicationModel.aggregate([{ $match: { deletedAt: { $eq: null } } }])
		.then((applications) => {
			return applications;
		})
		.catch((error) => {
			throw new Error(error.message);
		});
};

/**
 delete an Application
 * @param applicationId @type string
 */
export const archiveApplication = async (applicationId: string) => {
	return await ApplicationModel.findById(applicationId)
		.then(async (application) => {
			if (application && application.deletedAt === null) {
				application.deletedAt = new Date();
				return await application.save();
			} else {
				return "Application not found";
			}
		})
		.catch((error) => {
			throw new Error(error.message);
		});
};

/**
 * @function changeApplicationStatusIntoInterview to update the status into INTERVIEW of an application in the system
 * @param applicationId @type string
 */
export const changeApplicationStatusIntoInterview = async (
	request: Request,
	applicationId: string,
	interviewData: DocumentDefinition<IInterview>
) => {
	return await ApplicationModel.findById(applicationId)
		.then(async (application) => {
			if (application) {
				// Send email
				const emailTemplate = "Interview-Email-Template.html";
				const to = application.email;
				const subject = "MS Club of SLIIT - Interview";
				const emailBodyData = {
					name: application.name,
					email: application.email,
					date: moment.utc(interviewData.startDateTime).format("LL"),
					time: moment.utc(interviewData.startDateTime).format("LTS"),
					format: interviewData.format,
				};

				const email = {
					template: emailTemplate,
					to: to,
					subject: subject,
					body: emailBodyData,
				};

				const applicantMail = `${application.studentId.toLowerCase()}@my.sliit.lk`;
				const emailList = interviewData.attendees;
				emailList.push(applicantMail);
				const interviewScheduleDetails = {
					studentName: application.name,
					startDateTime: interviewData.startDateTime,
					endDateTime: interviewData.endDateTime,
					emailList: emailList,
				};

				// Send email data to message queue
				const channel = request.channel;
				request.queue.publishMessage(channel, JSON.stringify(email));
				application.status = "INTERVIEW";
				return await application.save().then((application) => {
					return axios
						.post(`${process.env.MS_MEETING_MANAGER_API}/api/msteams/schedule`, interviewScheduleDetails)
						.then(() => {
							return application;
						})
						.catch((error: any) => {
							throw new Error(error);
						});
				});
			} else {
				return null;
			}
		})
		.catch((error) => {
			throw new Error(error.message);
		});
};

/**
 * @function changeApplicationStatusIntoSelected to update the status into SELECTED of an application in the system
 * @param applicationId @type string
 */
export const changeApplicationStatusIntoSelected = async (request: Request, applicationId: string) => {
	return await ApplicationModel.findById(applicationId)
		.then(async (application) => {
			if (application) {
				// Send email
				const emailTemplate = "Selected-Email-Template.html";
				const to = application.email;
				const subject = "Congratulations from MS Club Team !";
				const emailBodyData = {
					name: application.name,
				};

				const email = {
					template: emailTemplate,
					to: to,
					subject: subject,
					body: emailBodyData,
				};

				// Send email data to message queue
				const channel = request.channel;
				request.queue.publishMessage(channel, JSON.stringify(email));
				application.status = "SELECTED";
				return await application.save();
			} else {
				return null;
			}
		})
		.catch((error) => {
			throw new Error(error.message);
		});
};

/**
 * @todo create @function changeApplicationStatusIntoRejected to update the status into REJECTED of
 * an application in the system
 * @param applicationId @type string
 */
export const changeApplicationStatusIntoRejected = async (applicationId: string) => {
	return await ApplicationModel.findById(applicationId)
		.then(async (application) => {
			if (application) {
				application.status = "REJECTED";
				return await application.save();
			}
		})
		.catch((error) => {
			throw new Error(error.message);
		});
};

/**
 * @todo create @function fetchPendingApplications to filter PENDING applications in the system
 */
export const fetchPendingApplications = async () => {
	return await ApplicationModel.aggregate([{ $match: { status: { $eq: "PENDING" }, deletedAt: { $eq: null } } }])
		.then((applications) => {
			return applications;
		})
		.catch((err) => {
			throw new Error(err.message);
		});
};
/**
 * @todo create @function fetchInterviewApplications to filter INTERVIEW applications in the system
 */
export const fetchInterviewApplications = async () => {
	return await ApplicationModel.aggregate([{ $match: { status: { $eq: "INTERVIEW" }, deletedAt: { $eq: null } } }])
		.then((applications) => {
			return applications;
		})
		.catch((err) => {
			throw new Error(err.message);
		});
};
/**
 * @todo create @function fetchSelectedApplications to filter SELECTED applications in the system
 */
export const fetchSelectedApplications = async () => {
	return await ApplicationModel.aggregate([{ $match: { status: { $eq: "SELECTED" }, deletedAt: { $eq: null } } }])
		.then((applications) => {
			return applications;
		})
		.catch((err) => {
			throw new Error(err.message);
		});
};
/**
 * @todo create @function fetchRejectedApplications to filter REJECTED applications in the system
 */
export const fetchRejectedApplications = async () => {
	return await ApplicationModel.aggregate([{ $match: { status: { $eq: "REJECTED" }, deletedAt: { $eq: null } } }])
		.then((applications) => {
			return applications;
		})
		.catch((err) => {
			throw new Error(err.message);
		});
};

/**
Get deleted applications - admin
 */
export const getDeletedApplicationsForAdmin = async () => {
	return await ApplicationModel.aggregate([{ $match: { deletedAt: { $ne: null } } }])
		.then((applications) => {
			return applications;
		})
		.catch((err) => {
			throw new Error(err.message);
		});
};
