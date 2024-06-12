// script.js
document.addEventListener('DOMContentLoaded', () => {
    const inputForm = document.getElementById('inputForm');
    const algorithmSelect = document.getElementById('algorithm');
    const preemptiveSelect = document.getElementById('preemptive');
    const numProcessesInput = document.getElementById('numProcesses');
    const processesInputDiv = document.getElementById('processesInput');
    const resultsDiv = document.getElementById('results');
    const ganttChart = document.getElementById('ganttChart');
    const metricsTableBody = document.getElementById('metricsTable').querySelector('tbody');
    const avgWaitingTimeElem = document.getElementById('avgWaitingTime');

    algorithmSelect.addEventListener('change', updateProcessInputs);
    numProcessesInput.addEventListener('change', updateProcessInputs);

    function updateProcessInputs() {
        processesInputDiv.innerHTML = '';
        const numProcesses = numProcessesInput.value;
        const algorithm = algorithmSelect.value;

        for (let i = 0; i < numProcesses; i++) {
            processesInputDiv.innerHTML += `
                <div class="process-input">
                    <label>Process ${i + 1}:</label>
                    <input type="number" placeholder="Burst Time" name="burstTime" required>
                    <input type="number" placeholder="Arrival Time" name="arrivalTime" required>
                    ${algorithm === 'priority' ? '<input type="number" placeholder="Priority" name="priority">' : ''}
                </div>
            `;
        }
    }

    inputForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const algorithm = document.getElementById('algorithm').value;
        const preemptive = document.getElementById('preemptive').value === 'preemptive';
        const numProcesses = parseInt(numProcessesInput.value);
        const processes = [];

        const burstTimes = Array.from(document.querySelectorAll('input[name="burstTime"]')).map(input => parseInt(input.value));
        const arrivalTimes = Array.from(document.querySelectorAll('input[name="arrivalTime"]')).map(input => parseInt(input.value));
        const priorities = algorithm === 'priority' ? Array.from(document.querySelectorAll('input[name="priority"]')).map(input => parseInt(input.value) || 0) : [];
        burstTimes.forEach((burstTime, index) => {
            processes.push({
                burstTime,
                arrivalTime: arrivalTimes[index],
                priority: priorities[index] || null,
                id: index + 1
            });
        });

        let results;
        switch (algorithm) {
            case 'fcfs':
                results = fcfs(processes);
                break;
            case 'sjf':
                results = sjf(processes, preemptive);
                break;
            case 'priority':
                results = priority(processes, preemptive);
                break;
            case 'roundRobin':
                const timeQuantum = parseInt(prompt('Enter Time Quantum:'));
                results = roundRobin(processes, timeQuantum);
                break;
        }

        displayResults(results);
    });

    function displayResults(results) {
        // Display Gantt Chart
        const ctx = ganttChart.getContext('2d');
        ctx.clearRect(0, 0, ganttChart.width, ganttChart.height);
        const totalWidth = ganttChart.width;
        const totalTime = Math.max(...results.map(r => r.completionTime));

        let currentTime = 0;
        const processColors = {};

        results.forEach(process => {
            if (!processColors[process.id]) {
                processColors[process.id] = `hsl(${process.id * 50}, 70%, 50%)`;
            }
            const width = ((process.completionTime - process.startTime) / totalTime) * totalWidth;
            ctx.fillStyle = processColors[process.id];
            ctx.fillRect(currentTime, 0, width, ganttChart.height);
            ctx.fillStyle = '#000';
            ctx.fillText(`P${process.id}`, currentTime + width / 2 - 10, ganttChart.height / 2);
            ctx.fillText(process.startTime, currentTime, ganttChart.height - 10); // Start time
            ctx.fillText(process.completionTime, currentTime + width - 20, ganttChart.height - 10); // End time
            currentTime += width;
        });

        // Display Metrics
        metricsTableBody.innerHTML = '';
        let totalWaitingTime = 0;
        results.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>P${process.id}</td>
                <td>${process.completionTime}</td>
                <td>${process.waitingTime}</td>
                <td>${process.turnaroundTime}</td>
            `;
            metricsTableBody.appendChild(row);
            totalWaitingTime += process.waitingTime;
        });

        const avgWaitingTime = totalWaitingTime / results.length;
        avgWaitingTimeElem.textContent = avgWaitingTime.toFixed(2);

        resultsDiv.style.display = 'block';
    }

    // FCFS Algorithm
    function fcfs(processes) {
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        let currentTime = 0;

        processes.forEach(process => {
            process.startTime = Math.max(currentTime, process.arrivalTime);
            process.completionTime = process.startTime + process.burstTime;
            process.turnaroundTime = process.completionTime - process.arrivalTime;
            process.waitingTime = process.startTime - process.arrivalTime;
            currentTime = process.completionTime;
        });

        return processes;
    }

    // SJF Algorithm
    function sjf(processes, preemptive) {
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        let currentTime = 0;
        let completedProcesses = [];
        let remainingTimes = processes.map(p => p.burstTime);
        let ganttChart = [];

        if (preemptive) {
            while (completedProcesses.length < processes.length) {
                let availableProcesses = processes.filter((p, i) => p.arrivalTime <= currentTime && remainingTimes[i] > 0);
                if (availableProcesses.length === 0) {
                    currentTime++;
                    continue;
                }
                availableProcesses.sort((a, b) => remainingTimes[processes.indexOf(a)] - remainingTimes[processes.indexOf(b)]);
                let currentProcess = availableProcesses[0];
                let currentIndex = processes.indexOf(currentProcess);

                if (!currentProcess.startTime && currentProcess.startTime !== 0) {
                    currentProcess.startTime = currentTime;
                }
                ganttChart.push({ id: currentProcess.id, startTime: currentTime, duration: 1 });
                currentTime++;
                remainingTimes[currentIndex]--;

                if (remainingTimes[currentIndex] === 0) {
                    currentProcess.completionTime = currentTime;
                    currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                    currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                    completedProcesses.push(currentProcess);
                }
            }
        } else {
            while (processes.length > 0) {
                let availableProcesses = processes.filter(p => p.arrivalTime <= currentTime);
                if (availableProcesses.length === 0) {
                    currentTime++;
                    continue;
                }
                availableProcesses.sort((a, b) => a.burstTime - b.burstTime);
                let process = availableProcesses[0];
                process.startTime = currentTime;
                process.completionTime = process.startTime + process.burstTime;
                process.turnaroundTime = process.completionTime - process.arrivalTime;
                process.waitingTime = process.startTime - process.arrivalTime;
                ganttChart.push({ id: process.id, startTime: process.startTime, duration: process.burstTime });
                currentTime = process.completionTime;
                completedProcesses.push(process);
                processes.splice(processes.indexOf(process), 1);
            }
        }

        return ganttChart.map(({ id, startTime, duration }) => {
            const process = completedProcesses.find(p => p.id === id);
            return {
                ...process,
                startTime,
                completionTime: startTime + duration,
            };
        });
    }

    // Priority Algorithm
    function priority(processes, preemptive) {
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        let currentTime = 0;
        let completedProcesses = [];
        let remainingTimes = processes.map(p => p.burstTime);
        let ganttChart = [];

        if (preemptive) {
            while (completedProcesses.length < processes.length) {
                let availableProcesses = processes.filter((p, i) => p.arrivalTime <= currentTime && remainingTimes[i] > 0);
                if (availableProcesses.length === 0) {
                    currentTime++;
                    continue;
                }
                availableProcesses.sort((a, b) => a.priority - b.priority);
                let currentProcess = availableProcesses[0];
                let currentIndex = processes.indexOf(currentProcess);

                if (!currentProcess.startTime && currentProcess.startTime !== 0) {
                    currentProcess.startTime = currentTime;
                }
                ganttChart.push({ id: currentProcess.id, startTime: currentTime, duration: 1 });
                currentTime++;
                remainingTimes[currentIndex]--;

                if (remainingTimes[currentIndex] === 0) {
                    currentProcess.completionTime = currentTime;
                    currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                    currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                    completedProcesses.push(currentProcess);
                }
            }
        } else {
            while (processes.length > 0) {
                let availableProcesses = processes.filter(p => p.arrivalTime <= currentTime);
                if (availableProcesses.length === 0) {
                    currentTime++;
                    continue;
                }
                availableProcesses.sort((a, b) => a.priority - b.priority);
                let process = availableProcesses[0];
                process.startTime = currentTime;
                process.completionTime = process.startTime + process.burstTime;
                process.turnaroundTime = process.completionTime - process.arrivalTime;
                process.waitingTime = process.startTime - process.arrivalTime;
                ganttChart.push({ id: process.id, startTime: process.startTime, duration: process.burstTime });
                currentTime = process.completionTime;
                completedProcesses.push(process);
                processes.splice(processes.indexOf(process), 1);
            }
        }

        return ganttChart.map(({ id, startTime, duration }) => {
            const process = completedProcesses.find(p => p.id === id);
            return {
                ...process,
                startTime,
                completionTime: startTime + duration,
            };
        });
    }

    // Round Robin Algorithm
    function roundRobin(processes, timeQuantum) {
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        let currentTime = 0;
        let queue = [];
        let completedProcesses = [];
        let remainingTimes = processes.map(p => p.burstTime);
        let ganttChart = [];

        while (completedProcesses.length < processes.length) {
            processes.forEach((process, index) => {
                if (process.arrivalTime <= currentTime && !queue.includes(index) && remainingTimes[index] > 0) {
                    queue.push(index);
                }
            });

            if (queue.length === 0) {
                currentTime++;
                continue;
            }

            const processIndex = queue.shift();
            const process = processes[processIndex];

            if (!process.startTime && process.startTime !== 0) {
                process.startTime = currentTime;
            }

            if (remainingTimes[processIndex] <= timeQuantum) {
                ganttChart.push({ id: process.id, startTime: currentTime, duration: remainingTimes[processIndex] });
                currentTime += remainingTimes[processIndex];
                process.completionTime = currentTime;
                process.turnaroundTime = process.completionTime - process.arrivalTime;
                process.waitingTime = process.turnaroundTime - process.burstTime;
                remainingTimes[processIndex] = 0;
                completedProcesses.push(process);
            } else {
                ganttChart.push({ id: process.id, startTime: currentTime, duration: timeQuantum });
                remainingTimes[processIndex] -= timeQuantum;
                currentTime += timeQuantum;
                queue.push(processIndex);
            }
        }

        return ganttChart.map(({ id, startTime, duration }) => {
            const process = completedProcesses.find(p => p.id === id);
            return {
                ...process,
                startTime,
                completionTime: startTime + duration,
            };
        });
    }
});
