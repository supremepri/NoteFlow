document.addEventListener("DOMContentLoaded", () => {
  let timerInterval;
  let elapsedSeconds = 0;

  function updateTimerDisplay() {
    const timerElement = document.getElementById("timer");
    if (!timerElement) return;
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    timerElement.innerText =
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      updateTimerDisplay();
    }, 1000);
  }

  function pauseTimer() {
    clearInterval(timerInterval);
  }

  function resetTimer() {
    clearInterval(timerInterval);
    elapsedSeconds = 0;
    updateTimerDisplay();
  }

  // Attach event listeners AFTER the DOM is fully loaded
  document.getElementById("startTimerBtn").addEventListener("click", startTimer);
  document.getElementById("pauseTimerBtn").addEventListener("click", pauseTimer);
  document.getElementById("resetTimerBtn").addEventListener("click", resetTimer);
});
