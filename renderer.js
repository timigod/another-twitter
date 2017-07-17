const remote = require('electron').remote
const Store = require('electron-store');

const store = new Store()
const authButton = document.getElementById('auth_button');
const notificationsToggle = document.getElementById('toggle_notifications');
const notificationsFieldset = document.getElementById('notifications_fieldset');
const auth = remote.getGlobal('auth')
const isAuthed = remote.getGlobal('isAuthed')

authButton.addEventListener('click', function () {
  auth()
});

notificationsToggle.addEventListener('change', function () {
  if (this.checked == true) {
    store.set('notifications?', 'on')
  } else {
    store.set('notifications?', 'off')
  }
})

isAuthed.then((bool) => {
  const isOn = store.get('notifications?')
  if (bool) notificationsFieldset.disabled = false
  if (bool && isOn == "on") notificationsToggle.checked = true
})




