import {
   auth, firebaseApp,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "./config/firebaseInit.js";

document.getElementById("login").addEventListener("click", async (event) => {
  event.preventDefault(); // stop normal link navigation

  checkAuthState();
});

function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
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
      window.location.href='company/company_dashboard.html';
    }
    else
    {
     window.location.href='company/auth/company_login.html'; 
    }
});