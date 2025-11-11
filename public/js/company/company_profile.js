import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {ITCFirebaseLogic} from "../fireabase/ITCFirebaseLogic.js";
import { Student } from "../model/Student.js";  
import { CompanyCloud } from "../fireabase/CompanyCloud.js";
import { db, auth } from "../config/firebaseInit.js";
import { StudentCloudDB } from "../fireabase/StudentCloud.js";
import { getNigerianIndustryDescription } from "../general/generalmethods.js";
const itc_firebase_logic = new ITCFirebaseLogic();
/** @type {import('../fireabase/CompanyCloud.js').CompanyCloud} */
const companyCloud = new CompanyCloud();
/** @type {import('../fireabase/StudentCloud.js').StudentCloudDB} */
const studentCloudDB = new StudentCloudDB();


const urlParams = new URLSearchParams(window.location.search);
const companyId = urlParams.get("id");

export class CompanyProfile 
{
    constructor()
     { 
        //console.log("CompanyProfile initialized");  
     }
    
    async init() {        
        if(!companyId)
        {
            console.error("No company ID provided in URL.");
            alart
            return;
        }

        try {
            const companyData = await companyCloud.getCompanyById(companyId);
            if (!companyData) {
                console.error("Company not found.");
                alert("An error occurred while fetching company data.");
                return;
            }
            this.displayCompanyProfile(companyData);
        } catch (error) {
            console.error("Error fetching company data:", error);
        }
    }

    displayCompanyProfile(companyData) {
        // Implement the logic to display the company profile
    }
}