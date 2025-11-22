import {
   auth, firebaseApp,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "./config/firebaseInit.js";
import { CompanyCloud } from "./fireabase/CompanyCloud.js";
import { StudentCloudDB } from "./fireabase/StudentCloud.js";
const studentCloudDB = new StudentCloudDB();
const companyCloud = new CompanyCloud();

document.getElementById("login").addEventListener("click", async (event) => {
  event.preventDefault(); // stop normal link navigation

  checkAuthState();
});

function checkAuthState() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      //console.log("User already logged in:", user.email);
      localStorage.setItem(
        "student",
        JSON.stringify({
          email: user.email,
          name: user.displayName || "",
          uid: user.uid,
          image: user.photoURL || "",
        })
      );

      var student = await studentCloudDB.getStudentById(auth.currentUser.uid);
      if(!student)
      {
        window.location.href = "auth/login.html";
      }

      // Redirect to dashboard
      window.location.replace("dashboard/itc_dashboard.html");
    } else {
      //console.log("No user session found — showing login form.");
      window.location.href = "auth/login.html";
      document.body.style.display = "block";
    }
  });
}


document.getElementById('company-loginbtn').addEventListener('click',async()=>
{
    await auth.authStateReady();
     
    
    if(auth.currentUser)
    {
       const company  = await companyCloud.getCompany(auth.currentUser.uid);
       if(company)
       {
         window.location.href='company/company_dashboard.html';
       }
       else
       {
        window.location.href='company/auth/company_login.html'; 
       }
      
    }
    else
    {
     window.location.href='company/auth/company_login.html'; 
    }
});