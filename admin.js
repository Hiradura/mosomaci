firebase.auth().onAuthStateChanged(function (user) {
    const adminLoginToggle = document.getElementById('admin-login-toggle');
    const adminLogoutButton = document.getElementById('admin-logout-button');

    if (claims.admin) {
        user.getIdToken(true).then((token) => {
            fetch(apiUrl + "/getClaims/" + user.uid, {
                method: 'GET',
                headers: { 'Authorization': token }
            })
            .then(res => res.json())
            .then(claims => {
                if (claims.admin) {
                    document.getElementById('admin-panel-screen').style.display = 'block';
                    showAdminAuthMessage("Sikeres bejelentkezés, Admin!", "green");
                    viewReportedComments(token);
                    viewRegisteredUsers(token);
                } else {
                    showAdminAuthMessage("Nem vagy admin!", "red");
                }
            })
            .catch(error => console.error("Hiba a claims lekérésénél:", error));
        });
    } else {
        if (adminLoginToggle) adminLoginToggle.style.display = 'inline-block';
        if (adminLogoutButton) adminLogoutButton.style.display = 'none';
    }
});

function viewReportedComments(token) {
    const commentsList = document.getElementById('admin-comments-list');
    commentsList.innerHTML = "<h3>Reportált kommentek</h3>";

    firebase.database().ref('comments').once('value', (snapshot) => {
        if (snapshot.exists()) {
            let foundReport = false;
            snapshot.forEach((commentSnapshot) => {
                const commentId = commentSnapshot.key;
                const commentData = commentSnapshot.val();
                if (commentData.reports) {
                    foundReport = true;
                    Object.keys(commentData.reports).forEach((reportId) => {
                        const report = commentData.reports[reportId];
                        const commentElement = document.createElement('div');
                        commentElement.classList.add('comment-item');
                        commentElement.innerHTML = `
                            <p><strong>Felhasználó:</strong> ${commentData.name}</p>
                            <p><strong>Komment:</strong> ${commentData.text}</p>
                            <p><strong>Jelentés oka:</strong> ${report.reportReason}</p>
                            <p><strong>Jelentés ideje:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
                            <button onclick="deleteComment('${commentId}')">Komment törlése</button>
                        `;
                        commentsList.appendChild(commentElement);
                    });
                }
            });
            if (!foundReport) commentsList.innerHTML += "<p>Nincsenek jelentett kommentek.</p>";
        } else {
            commentsList.innerHTML += "<p>Nincsenek kommentek.</p>";
        }
    });
}

function deleteComment(commentId) {
    if (confirm("Biztosan törölni szeretnéd ezt a kommentet?")) {
        firebase.database().ref('comments/' + commentId).remove()
            .then(() => {
                alert("Komment sikeresen törölve!");
                firebase.auth().currentUser.getIdToken(true).then(token => viewReportedComments(token));
            })
            .catch((error) => {
                console.error("Hiba a komment törlésekor:", error);
                alert("Nem sikerült törölni a kommentet.");
            });
    }
}
window.deleteComment = deleteComment;

function viewRegisteredUsers(token) {
    const usersList = document.getElementById('admin-users-list');
    usersList.innerHTML = "<h3>Regisztrált felhasználók</h3>";
    firebase.database().ref('users').once('value').then(snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(userSnap => {
                const userId = userSnap.key;
                const userData = userSnap.val();
                const role = userData.role || "user";
                const userElement = document.createElement('div');
                userElement.classList.add('user-item');
                userElement.innerHTML = `
                    <div>
                        <p><strong>Név:</strong> ${userData.name || "N/A"}</p>
                        <p><strong>Email:</strong> ${userData.email || "N/A"}</p>
                        <p><strong>Jogosultság:</strong> ${role}</p>
                    </div>
                    <div>
                        <button onclick="updateUserRole('${userId}', 'admin')">Admin jog</button>
                        <button onclick="updateUserRole('${userId}', 'user')">User jog</button>
                        <button onclick="deleteUserAccount('${userId}')">Fiók törlése</button>
                    </div>
                `;
                usersList.appendChild(userElement);
            });
        } else {
            usersList.innerHTML += "<p>Nincsenek regisztrált felhasználók az adatbázisban.</p>";
        }
    });
}

function deleteUserAccount(uid) {
    if (!confirm("Biztosan törölni szeretnéd ezt a felhasználót? Ez nem visszavonható!")) return;
    firebase.auth().currentUser.getIdToken(true).then(token => {
        fetch(firebaseUrl + "/deleteUser", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": token },
            body: JSON.stringify({ uid })
        })
        .then(res => res.json())
        .then(data => {
            console.log("API válasz:", data);
            alert("Felhasználó törölve!");
            viewRegisteredUsers(token);
        })
        .catch(err => {
            console.error("Hiba a törléskor:", err);
            alert("Hiba történt a fiók törlése közben!");
        });
    });
}
window.deleteUserAccount = deleteUserAccount;