/**
 * 计时器类
 */
class Timer {
    constructor() {
        this.initializeElements();
        this.initializeVariables();
        this.initializeEventListeners();
        this.loadSettings();
        this.loadRecords();
    }

    /**
     * 初始化DOM元素
     */
    initializeElements() {
        this.timer = document.getElementById('timer');
        this.startButton = document.getElementById('start');
        this.pauseButton = document.getElementById('pause');
        this.resetButton = document.getElementById('reset');
        this.recordButton = document.getElementById('record');
        this.setButton = document.getElementById('set');
        this.recordsContainer = document.getElementById('records');
    }

    /**
     * 初始化变量
     */
    initializeVariables() {
        this.startTime = 0;
        this.updatedTime = 0;
        this.difference = 0;
        this.tInterval = null;
        this.isRunning = false;
        this.savedTime = 0;
        this.totalTime = 0;

        // 设置相关变量
        this.soundEnabled = localStorage.getItem('soundEnabled') === 'true';
        this.autoSave = localStorage.getItem('autoSave') === 'true';
        this.showMilliseconds = localStorage.getItem('showMilliseconds') !== 'false';
        this.targetTime = localStorage.getItem('targetTime') || '';
        this.volume = localStorage.getItem('volume') || 50;
        this.fontSize = localStorage.getItem('fontSize') || 'normal';
    }

    /**
     * 初始化事件监听器
     */
    initializeEventListeners() {
        this.startButton.addEventListener('click', () => this.startTimer());
        this.pauseButton.addEventListener('click', () => this.pauseTimer());
        this.resetButton.addEventListener('click', () => this.resetTimer());
        this.recordButton.addEventListener('click', () => this.recordTime());
        this.setButton.addEventListener('click', () => this.setTimer());

        document.getElementById('export').addEventListener('click', () => this.exportRecords());
        document.getElementById('clear').addEventListener('click', () => this.clearRecords());
        document.getElementById('help').addEventListener('click', () => this.toggleHelp());
        document.getElementById('settings').addEventListener('click', () => this.openSettings());
        document.getElementById('overlay').addEventListener('click', () => this.closeSettings());

        // 分享按钮
        document.querySelector('.share-button.wechat').addEventListener('click', () => this.shareToSocial('wechat'));
        document.querySelector('.share-button.weibo').addEventListener('click', () => this.shareToSocial('weibo'));
        document.querySelector('.share-button.qq').addEventListener('click', () => this.shareToSocial('qq'));

        // 键盘快捷键
        document.addEventListener('keydown', (event) => this.handleKeyPress(event));

        // 设置面板事件
        document.getElementById('sound-enabled').addEventListener('change', (e) => {
            this.soundEnabled = e.target.checked;
            localStorage.setItem('soundEnabled', this.soundEnabled);
        });

        document.getElementById('auto-save').addEventListener('change', (e) => {
            this.autoSave = e.target.checked;
            localStorage.setItem('autoSave', this.autoSave);
        });

        document.getElementById('show-milliseconds').addEventListener('change', (e) => {
            this.showMilliseconds = e.target.checked;
            localStorage.setItem('showMilliseconds', this.showMilliseconds);
            this.updateDisplay();
        });

        document.getElementById('volume-control').addEventListener('input', (e) => {
            this.volume = e.target.value;
            localStorage.setItem('volume', this.volume);
        });

        document.getElementById('font-size').addEventListener('change', (e) => {
            this.fontSize = e.target.value;
            localStorage.setItem('fontSize', this.fontSize);
            this.updateFontSize();
        });
    }

    /**
     * 开始计时器
     */
    startTimer() {
        if (!this.isRunning) {
            if (this.savedTime) {
                this.startTime = Date.now() - this.savedTime;
            } else {
                this.startTime = Date.now();
            }
            this.tInterval = setInterval(() => this.updateDisplay(), 10);
            this.isRunning = true;
            this.startButton.innerHTML = '继续';
            this.timer.classList.add('pulse');
            this.playSound('click');
        }
    }

    /**
     * 暂停计时器
     */
    pauseTimer() {
        if (this.isRunning) {
            clearInterval(this.tInterval);
            this.savedTime = Date.now() - this.startTime;
            this.isRunning = false;
            this.startButton.innerHTML = '开始';
            this.timer.classList.remove('pulse');
            this.playSound('click');
        }
    }

    /**
     * 重置计时器
     */
    resetTimer() {
        clearInterval(this.tInterval);
        this.isRunning = false;
        this.savedTime = 0;
        this.totalTime = 0;
        this.startButton.innerHTML = '开始';
        this.updateDisplay();
        this.timer.classList.remove('pulse');
        this.recordsContainer.innerHTML = '';
        this.updateStats();
        this.playSound('complete');
    }

    /**
     * 记录当前时间
     */
    recordTime() {
        if (this.isRunning) {
            this.playSound('click');
            const record = document.createElement('div');
            record.className = 'record';
            record.innerHTML = `计次 ${document.getElementsByClassName('record').length + 1}: ${this.timer.innerHTML}`;
            this.recordsContainer.insertBefore(record, this.recordsContainer.firstChild);
            this.updateStats();
            this.saveRecords();
        }
    }

    /**
     * 更新显示时间
     */
    updateDisplay() {
        const currentTime = this.isRunning ? Date.now() - this.startTime : this.savedTime;
        const hours = Math.floor(currentTime / 3600000);
        const minutes = Math.floor((currentTime % 3600000) / 60000);
        const seconds = Math.floor((currentTime % 60000) / 1000);
        const milliseconds = currentTime % 1000;

        this.timer.innerHTML = this.showMilliseconds
            ? `${this.padNumber(hours, 2)}:${this.padNumber(minutes, 2)}:${this.padNumber(seconds, 2)}:${this.padNumber(milliseconds, 3)}`
            : `${this.padNumber(hours, 2)}:${this.padNumber(minutes, 2)}:${this.padNumber(seconds, 2)}`;

        // 检查是否达到目标时间
        if (this.targetTime) {
            const [targetHours, targetMinutes] = this.targetTime.split(':').map(Number);
            if (hours === targetHours && minutes === targetMinutes && seconds === 0) {
                this.playSound('complete');
                this.showNotification('已达到目标时间！');
            }
        }

        // 更新总计时长
        this.totalTime = currentTime;
        document.getElementById('total-time').textContent = this.formatTime(this.totalTime);
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        const records = Array.from(document.getElementsByClassName('record'))
            .map(record => {
                const time = record.textContent.split(': ')[1];
                return this.timeToMilliseconds(time);
            });

        if (records.length > 0) {
            const bestTime = Math.min(...records);
            const avgTime = records.reduce((a, b) => a + b, 0) / records.length;

            document.getElementById('best-time').textContent = this.formatTime(bestTime);
            document.getElementById('avg-time').textContent = this.formatTime(avgTime);
            document.getElementById('record-count').textContent = records.length;
        } else {
            document.getElementById('best-time').textContent = '--:--:--';
            document.getElementById('avg-time').textContent = '--:--:--';
            document.getElementById('record-count').textContent = '0';
        }
    }

    /**
     * 处理键盘事件
     */
    handleKeyPress(event) {
        switch (event.key.toLowerCase()) {
            case 's': this.startTimer(); break;
            case 'p': this.pauseTimer(); break;
            case 'r': this.resetTimer(); break;
            case 'l': this.recordTime(); break;
            case 'h': this.toggleHelp(); break;
            case 't': this.toggleTheme(); break;
            case 'o': this.openSettings(); break;
            case 'c': this.clearRecords(); break;
            case 'e': this.exportRecords(); break;
        }
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    }

    /**
     * 显示/隐藏帮助
     */
    toggleHelp() {
        const hint = document.querySelector('.shortcut-hint');
        hint.classList.toggle('show');
    }

    /**
     * 导出记录
     */
    exportRecords() {
        const records = Array.from(document.getElementsByClassName('record'))
            .map(record => record.textContent)
            .join('\n');

        const blob = new Blob([records], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timer-records-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.showNotification('记录已导出');
    }

    /**
     * 清除记录
     */
    clearRecords() {
        if (confirm('确定要清除所有记录吗？')) {
            this.recordsContainer.innerHTML = '';
            this.updateStats();
            this.saveRecords();
            this.showNotification('记录已清除');
        }
    }

    /**
     * 分享到社交媒体
     */
    shareToSocial(platform) {
        const text = `我的计时记录：${this.timer.innerHTML}`;
        let url = '';

        switch (platform) {
            case 'wechat':
                this.showNotification('请截图分享到微信');
                break;
            case 'weibo':
                url = `http://service.weibo.com/share/share.php?url=${location.href}&title=${encodeURIComponent(text)}`;
                window.open(url, '_blank');
                break;
            case 'qq':
                url = `http://connect.qq.com/widget/shareqq/index.html?url=${location.href}&title=${encodeURIComponent(text)}`;
                window.open(url, '_blank');
                break;
        }
    }

    /**
     * 打开设置面板
     */
    openSettings() {
        document.getElementById('settings-panel').classList.add('show');
        document.getElementById('overlay').classList.add('show');
        document.getElementById('sound-enabled').checked = this.soundEnabled;
        document.getElementById('auto-save').checked = this.autoSave;
        document.getElementById('show-milliseconds').checked = this.showMilliseconds;
        document.getElementById('target-time-input').value = this.targetTime;
        document.getElementById('volume-control').value = this.volume;
        document.getElementById('font-size').value = this.fontSize;
    }

    /**
     * 关闭设置面板
     */
    closeSettings() {
        document.getElementById('settings-panel').classList.remove('show');
        document.getElementById('overlay').classList.remove('show');
    }

    /**
     * 保存设置
     */
    saveSettings() {
        this.soundEnabled = document.getElementById('sound-enabled').checked;
        this.autoSave = document.getElementById('auto-save').checked;
        this.showMilliseconds = document.getElementById('show-milliseconds').checked;
        this.targetTime = document.getElementById('target-time-input').value;
        this.volume = document.getElementById('volume-control').value;
        this.fontSize = document.getElementById('font-size').value;

        localStorage.setItem('soundEnabled', this.soundEnabled);
        localStorage.setItem('autoSave', this.autoSave);
        localStorage.setItem('showMilliseconds', this.showMilliseconds);
        localStorage.setItem('targetTime', this.targetTime);
        localStorage.setItem('volume', this.volume);
        localStorage.setItem('fontSize', this.fontSize);

        this.updateDisplay();
        this.updateFontSize();
        this.showNotification('设置已保存');
        this.closeSettings();
    }

    /**
     * 更新字体大小
     */
    updateFontSize() {
        document.body.classList.remove('font-size-small', 'font-size-normal', 'font-size-large');
        if (this.fontSize !== 'normal') {
            document.body.classList.add(`font-size-${this.fontSize}`);
        }
    }

    /**
     * 播放音效
     */
    playSound(type) {
        if (!this.soundEnabled) return;
        const sound = document.getElementById(type === 'click' ? 'click-sound' : 'complete-sound');
        sound.volume = this.volume / 100;
        sound.currentTime = 0;
        sound.play().catch(() => { });
    }

    /**
     * 显示通知
     */
    showNotification(message) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 3000);
    }

    /**
     * 保存记录到本地存储
     */
    saveRecords() {
        if (!this.autoSave) return;
        const records = Array.from(document.getElementsByClassName('record'))
            .map(record => record.textContent);
        localStorage.setItem('timerRecords', JSON.stringify(records));
    }

    /**
     * 加载本地存储的记录
     */
    loadRecords() {
        const records = JSON.parse(localStorage.getItem('timerRecords') || '[]');
        records.forEach(record => {
            const div = document.createElement('div');
            div.className = 'record';
            div.textContent = record;
            this.recordsContainer.appendChild(div);
        });
        this.updateStats();
    }

    /**
     * 加载设置
     */
    loadSettings() {
        if (localStorage.getItem('darkMode') === 'true') {
            this.toggleTheme();
        }
        this.updateFontSize();
        if (this.targetTime) {
            document.getElementById('target-time').textContent = `目标时间: ${this.targetTime}`;
        }
    }

    // 工具函数
    padNumber(num, length) {
        return String(num).padStart(length, '0');
    }

    timeToMilliseconds(timeStr) {
        const [h, m, s, ms] = timeStr.split(':').map(Number);
        return ((h * 60 + m) * 60 + s) * 1000 + (ms || 0);
    }

    formatTime(ms) {
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `${this.padNumber(h, 2)}:${this.padNumber(m, 2)}:${this.padNumber(s, 2)}`;
    }
}

// 初始化计时器
const timer = new Timer(); 