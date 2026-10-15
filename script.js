const taskInput = document.getElementById('taskInput');
const categoryInput = document.getElementById('categoryInput');
const taskDateInput = document.getElementById('taskDateInput');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const calendarInput = document.getElementById('calendarInput');
const searchInput = document.getElementById('searchInput');
const currentDateDisplay = document.getElementById('currentDateDisplay');
const todayCount = document.getElementById('todayCount');
const pendingCount = document.getElementById('pendingCount');
const progressPercent = document.getElementById('progressPercent');
const progressBarFill = document.getElementById('progressBarFill');
const filterBtns = document.querySelectorAll('.filter-btn');

// モーダル関連の要素
const memoModal = document.getElementById('memoModal');
const modalTaskTitle = document.getElementById('modalTaskTitle');
const memoTextarea = document.getElementById('memoTextarea');
const closeMemoBtn = document.getElementById('closeMemoBtn');

let activeTaskIndex = null; // 現在メモを開いているタスクのインデックス
let tasks = JSON.parse(localStorage.getItem('dashboard_tasks_v5')) || [];
let currentFilter = 'all';

const todayObj = new Date();
const todayStr = todayObj.toISOString().split('T')[0];
taskDateInput.value = todayStr;
calendarInput.value = todayStr;
currentDateDisplay.textContent = `今日の日付: ${todayStr}`;

function calculateDaysLeft(targetDateStr) {
    if (!targetDateStr) return null;
    const target = new Date(targetDateStr);
    const today = new Date(todayStr);
    const diffTime = target.setHours(0,0,0,0) - today.setHours(0,0,0,0);
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function renderTasks() {
    taskList.innerHTML = '';
    
    const keyword = searchInput.value.toLowerCase();

    const filteredTasks = tasks.filter(task => {
        const matchesFilter = 
            currentFilter === 'active' ? !task.completed :
            currentFilter === 'completed' ? task.completed : true;

        const matchesSearch = task.text.toLowerCase().includes(keyword);

        return matchesFilter && matchesSearch;
    });

    filteredTasks.forEach((task) => {
        const li = document.createElement('li');
        if (task.completed) li.classList.add('completed');

        // 上段：カテゴリー、タスク名
        const topRow = document.createElement('div');
        topRow.classList.add('task-top-row');

        const infoDiv = document.createElement('div');
        infoDiv.classList.add('task-info');
        
        const badgeSpan = document.createElement('span');
        badgeSpan.classList.add('category-badge', `cat-${task.category}`);
        badgeSpan.textContent = task.category;

        const textSpan = document.createElement('span');
        textSpan.classList.add('task-text');
        textSpan.textContent = task.text;

        infoDiv.appendChild(badgeSpan);
        infoDiv.appendChild(textSpan);

        infoDiv.addEventListener('click', () => {
            const realIndex = tasks.indexOf(task);
            tasks[realIndex].completed = !tasks[realIndex].completed;
            if (tasks[realIndex].completed) {
                tasks[realIndex].progress = 100;
            }
            saveAndRender();
        });

        topRow.appendChild(infoDiv);
        li.appendChild(topRow);

        // 下段：進捗スライダー、メモボタン、期限日、削除ボタン
        const bottomRow = document.createElement('div');
        bottomRow.classList.add('task-bottom-row');

        // 進捗スライダー
        const sliderContainer = document.createElement('div');
        sliderContainer.classList.add('progress-slider-container');

        const sliderLabel = document.createElement('span');
        sliderLabel.textContent = `進捗: ${task.progress || 0}%`;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '0';
        slider.max = '100';
        slider.value = task.progress || 0;
        slider.classList.add('task-slider');

        slider.addEventListener('input', (e) => {
            const realIndex = tasks.indexOf(task);
            const val = parseInt(e.target.value);
            tasks[realIndex].progress = val;
            sliderLabel.textContent = `進捗: ${val}%`;
            
            if (val === 100) {
                tasks[realIndex].completed = true;
            } else if (tasks[realIndex].completed && val < 100) {
                tasks[realIndex].completed = false;
            }
            saveAndRender();
        });

        sliderContainer.appendChild(sliderLabel);
        sliderContainer.appendChild(slider);

        // アクションボタン群（メモ ＆ 削除）
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('task-actions');

        // メモボタン
        const memoBtn = document.createElement('button');
        memoBtn.textContent = task.memo ? '📝 メモあり' : '📝 メモ';
        memoBtn.classList.add('memo-btn');
        if (task.memo) memoBtn.classList.add('has-memo');

        memoBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 完了のクリックイベントが伝播しないようにする
            activeTaskIndex = tasks.indexOf(task);
            modalTaskTitle.textContent = task.text;
            memoTextarea.value = task.memo || '';
            memoModal.classList.add('active');
        });

        // 残り日数バッジ
        const daysLeft = calculateDaysLeft(task.date);
        const countdownSpan = document.createElement('span');
        countdownSpan.classList.add('countdown-badge');

        if (daysLeft !== null) {
            if (daysLeft < 0) {
                countdownSpan.textContent = `期限切れ`;
                countdownSpan.classList.add('deadline-over');
            } else if (daysLeft === 0) {
                countdownSpan.textContent = `今日期限`;
                countdownSpan.classList.add('deadline-soon');
            } else {
                countdownSpan.textContent = `あと${daysLeft}日`;
                countdownSpan.classList.add('deadline-safe');
            }
        }

        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.classList.add('delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const realIndex = tasks.indexOf(task);
            tasks.splice(realIndex, 1);
            saveAndRender();
        });

        actionsDiv.appendChild(memoBtn);
        if (daysLeft !== null) actionsDiv.appendChild(countdownSpan);
        actionsDiv.appendChild(deleteBtn);

        bottomRow.appendChild(sliderContainer);
        bottomRow.appendChild(actionsDiv);
        li.appendChild(bottomRow);

        taskList.appendChild(li);
    });

    updateStatsAndProgress();
}

// モーダルを閉じる時にメモ内容を保存する
closeMemoBtn.addEventListener('click', () => {
    if (activeTaskIndex !== null) {
        tasks[activeTaskIndex].memo = memoTextarea.value;
        saveAndRender();
    }
    memoModal.classList.remove('active');
    activeTaskIndex = null;
});

// モーダルの背景をクリックしても閉じられるようにする
memoModal.addEventListener('click', (e) => {
    if (e.target === memoModal) {
        closeMemoBtn.click();
    }
});

function updateStatsAndProgress() {
    const totalCount = tasks.length;
    const pendingCountNum = tasks.filter(t => !t.completed).length;

    todayCount.textContent = tasks.filter(t => t.date === todayStr).length;
    pendingCount.textContent = pendingCountNum;

    let totalProgress = 0;
    if (totalCount > 0) {
        tasks.forEach(t => {
            totalProgress += (t.progress || 0);
        });
        const averageProgress = Math.round(totalProgress / totalCount);
        progressPercent.textContent = `${averageProgress}%`;
        progressBarFill.style.width = `${averageProgress}%`;
    } else {
        progressPercent.textContent = `0%`;
        progressBarFill.style.width = `0%`;
    }
}

function saveAndRender() {
    localStorage.setItem('dashboard_tasks_v5', JSON.stringify(tasks));
    renderTasks();
}

addBtn.addEventListener('click', () => {
    const text = taskInput.value.trim();
    if (text === '') return;
    
    tasks.push({
        text: text,
        category: categoryInput.value,
        date: taskDateInput.value || todayStr,
        progress: 0,
        memo: '', // メモの初期値は空
        completed: false
    });

    taskInput.value = '';
    saveAndRender();
});

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addBtn.click();
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTasks();
    });
});

searchInput.addEventListener('input', () => {
    renderTasks();
});

renderTasks();