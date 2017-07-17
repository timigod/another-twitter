const remote = require('electron').remote
const authButton = document.getElementById('auth_button');
const notificationsToggle = document.getElementById('toggle_notifications');
const notificationsFieldset = document.getElementById('notifications_fieldset');
const auth = remote.getGlobal('auth')

authButton.addEventListener('click', function () {
    auth()
});



