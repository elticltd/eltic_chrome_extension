document.addEventListener("DOMContentLoaded", function () {
  const sendEmailBtn = document.getElementById("sendEmailBtn");
  const verifyCodeBtn = document.getElementById("verifyCodeBtn");
  const emailInput = document.getElementById("email");
  const codeInput = document.getElementById("code");
  const codeSection = document.getElementById("codeSection");
  const message = document.getElementById("message");

  function isValidEmail(email) {
    // Basic email validation: must contain "@" and "."
    // Additional check to ensure no dangerous characters
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidCharsPattern = /[%'"();<>=]/; // Checks for SQL injection related characters

    return emailPattern.test(email) && !invalidCharsPattern.test(email);
  }

  sendEmailBtn.addEventListener("click", function () {
    const email = emailInput.value;
    let responseStatusCode = 0;
    if (isValidEmail(email)) {
      let formData =
        '{"FieldName": "ExtensionRegister", "FieldValue": "@email@", "FieldName2": "Option", "FieldValue2": "819"}'
          .replace("@email@", email)
          .replace('/"', "~");

      fetch(BASE_URL + "insertout/?id=&t=11", {
        method: "POST",
        headers: {
          charset: "UTF-8",
          "content-type": "application/json",
          accept: "application/json",
        },
        body: formData,
      })
        .then((response) => {
          responseStatusCode = response.status;
          return response.json();
        })
        .then((response) => {
          if (responseStatusCode === 200 || responseStatusCode === 201) {
            showUserFeedback("Verification code sent to your email.");
            codeSection.style.display = "block";
          } else {
            showUserFeedback("Failed to send verification code. Try again.");
          }
        })
        .catch((error) => {
          console.log("Error:", error);
          showUserFeedback("Error sending email. Try again later.");
        });
    } else {
      showUserFeedback("Please enter a valid email address.");
    }
  });

  function showUserFeedback(message, type = "info") {
    const feedbackElement = document.getElementById("feedback");
    feedbackElement.textContent = message;
    feedbackElement.className = `feedback ${type}`;
    feedbackElement.style.display = "block";

    setTimeout(() => {
      feedbackElement.style.display = "none";
    }, 5000);
  }

  verifyCodeBtn.addEventListener("click", function () {
    const email = emailInput.value;
    const code = codeInput.value;

    if (code && code.length == 6) {
      let formData =
        '{"FieldName": "ExtensionRegister", "FieldValue": "@email@", "FieldName2": "Validation", "FieldValue2": "@code@"}'
          .replace("@email@", email)
          .replace("@code@", code)
          .replace('/"', "~");

      fetch(BASE_URL + "insertout/?id=&t=12", {
        method: "POST",
        headers: {
          charset: "UTF-8",
          "content-type": "application/json",
          accept: "application/json",
        },
        body: formData,
      })
        .then((response) => {
          responseStatusCode = response.status;
          return response.json();
        })
        .then((response) => {
          if (responseStatusCode === 200 || responseStatusCode === 201) {
            showUserFeedback("Code validation successful.");
            chrome.storage.local.set(
              { userToken: response, userEmail: email });
              chrome.runtime.sendMessage({ action: "logout" }, () => {
                
              });
            window.close();
          } else {
            if (responseStatusCode === 203) {
              showUserFeedback(response);
            }
            else {
            showUserFeedback("Failed to send verification code. Try again. " + responseStatusCode);
          }

          }
        })
        .catch((error) => {
          showUserFeedback("Error. Try again later.");
        });
    } else {
      showUserFeedback("Please enter the correct verification code.");
    }
  });
});
