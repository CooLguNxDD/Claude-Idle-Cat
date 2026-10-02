const button = document.getElementById('locate')
const status = document.getElementById('status')
const token = new URLSearchParams(location.search).get('t') ?? ''

const locate = () => new Promise((resolve, reject) => {
  navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 })
})
button.addEventListener('click', async () => {
  if (!navigator.geolocation) {
    status.textContent = 'This browser cannot provide location. Choose a city in the Weather tab.'
    return
  }
  button.disabled = true
  status.textContent = 'Waiting for location permission and a location fix…'
  try {
    const position = await locate()
    const latitude = Math.round(position.coords.latitude * 100) / 100
    const longitude = Math.round(position.coords.longitude * 100) / 100
    const response = await fetch('/api/location', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-arcade-token': token },
      body: JSON.stringify({ latitude, longitude }),
    })
    if (!response.ok) throw new Error('connection')
    status.textContent = `Saved ${latitude.toFixed(2)}, ${longitude.toFixed(2)}. Return to your cat’s Weather tab to see the weather.`
    button.textContent = 'Update device location'
  } catch (error) {
    status.textContent = error.code === 1 ? 'Location permission was denied. Allow it in your browser, or choose a city in the pane.'
      : error.code === 2 || error.code === 3 ? 'Device location is unavailable. Check system location services, retry, or choose a city in the pane.'
        : 'Could not save location. Reopen this page from the Weather tab while Claude Code is running.'
  } finally {
    button.disabled = false
  }
})
