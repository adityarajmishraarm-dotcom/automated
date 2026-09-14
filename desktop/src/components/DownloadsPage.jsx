import React, { useState } from 'react';

export default function DownloadsPage({
    downloads = [],
    onCancelDownload,
    onPauseDownload,
    onResumeDownload,
    onShowInFolder,
    onOpenFile,
    onOpenDownloadsFolder,
    onClearCompleted
}) {
    const [searchTerm, setSearchTerm] = useState('');

    const getFileIcon = (filename = '', mimeType = '') => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext) || mimeType.includes('video')) return '🎬';
        if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext) || mimeType.includes('audio')) return '🎵';
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || mimeType.includes('image')) return '🖼️';
        if (['pdf', 'doc', 'docx', 'txt', 'epub'].includes(ext)) return '📄';
        if (['exe', 'msi', 'dmg', 'iso'].includes(ext)) return '⚙️';
        return '📥';
    };

    const formatDomain = (url = '') => {
        try {
            const u = new URL(url);
            return u.hostname;
        } catch (e) {
            return url.slice(0, 40);
        }
    };

    const filteredDownloads = downloads.filter(dl => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (dl.filename && dl.filename.toLowerCase().includes(q)) ||
               (dl.url && dl.url.toLowerCase().includes(q));
    });

    const activeDownloads = filteredDownloads.filter(d => d.state === 'progressing');
    const pastDownloads = filteredDownloads.filter(d => d.state !== 'progressing');

    return (
        <div className="downloads-page-container">
            {/* Top Toolbar Header */}
            <header className="downloads-header">
                <div className="downloads-header-left">
                    <span className="downloads-logo-icon">📥</span>
                    <div>
                        <h1 className="downloads-title">Downloads</h1>
                        <p className="downloads-subtitle">
                            {activeDownloads.length > 0 
                                ? `${activeDownloads.length} active download${activeDownloads.length > 1 ? 's' : ''}` 
                                : `${downloads.length} total downloads`}
                        </p>
                    </div>
                </div>

                <div className="downloads-search-wrapper">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="downloads-search-input"
                        placeholder="Search downloaded files..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="search-clear-btn" onClick={() => setSearchTerm('')}>✕</button>
                    )}
                </div>

                <div className="downloads-header-actions">
                    <button 
                        className="downloads-action-btn primary"
                        title="Open Downloads Folder on this computer"
                        onClick={onOpenDownloadsFolder}
                    >
                        📁 Open Downloads Folder
                    </button>
                    {downloads.some(d => d.state === 'completed' || d.state === 'cancelled') && (
                        <button 
                            className="downloads-action-btn secondary"
                            title="Clear completed and cancelled downloads from history"
                            onClick={onClearCompleted}
                        >
                            🧹 Clear Completed
                        </button>
                    )}
                </div>
            </header>

            {/* Downloads Content Area */}
            <main className="downloads-content">
                {filteredDownloads.length === 0 ? (
                    <div className="downloads-empty-state">
                        <div className="empty-icon-circle">📥</div>
                        <h2>{searchTerm ? 'No downloads match your search' : 'No downloads yet'}</h2>
                        <p>{searchTerm ? 'Try searching for another filename or keyword.' : 'Files you download using Antigravity Browser will appear here with live speed and progress.'}</p>
                        <button className="downloads-action-btn primary" onClick={onOpenDownloadsFolder}>
                            Open Downloads Folder
                        </button>
                    </div>
                ) : (
                    <div className="downloads-list">
                        {filteredDownloads.map((dl) => {
                            const isProgressing = dl.state === 'progressing';
                            const isCompleted = dl.state === 'completed';
                            const isPaused = dl.isPaused || dl.state === 'paused';
                            const isCancelled = dl.state === 'cancelled' || dl.state === 'interrupted';

                            return (
                                <div key={dl.id} className={`download-card ${dl.state}`}>
                                    {/* File Icon */}
                                    <div className="download-file-icon">
                                        {getFileIcon(dl.filename, dl.mimeType)}
                                    </div>

                                    {/* Main File Details */}
                                    <div className="download-info">
                                        <div className="download-title-row">
                                            <span 
                                                className={`download-filename ${isCompleted ? 'clickable' : ''}`}
                                                title={dl.savePath || dl.filename}
                                                onClick={() => {
                                                    if (isCompleted && onOpenFile) onOpenFile(dl.savePath);
                                                }}
                                            >
                                                {dl.filename}
                                            </span>
                                            <span className={`download-badge ${dl.state}`}>
                                                {isProgressing && !isPaused && '⚡ Downloading'}
                                                {isPaused && '⏸ Paused'}
                                                {isCompleted && '✓ Completed'}
                                                {isCancelled && '✕ Cancelled'}
                                            </span>
                                        </div>

                                        <div className="download-source-row">
                                            <a 
                                                href={dl.url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="download-domain"
                                                title={dl.url}
                                            >
                                                🌐 {formatDomain(dl.url)}
                                            </a>
                                            {dl.savePath && (
                                                <span className="download-save-path" title={dl.savePath}>
                                                    • {dl.savePath}
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="download-progress-track">
                                            <div 
                                                className={`download-progress-fill ${isCompleted ? 'fill-done' : ''} ${isCancelled ? 'fill-cancelled' : ''}`}
                                                style={{ width: `${Math.max(3, dl.percent || 0)}%` }}
                                            />
                                        </div>

                                        {/* Status & Metrics */}
                                        <div className="download-metrics-row">
                                            <div className="metrics-left">
                                                <span className="metric-bytes">
                                                    {dl.receivedBytesFormatted || '0 B'} of {dl.totalBytesFormatted || 'Unknown size'}
                                                </span>
                                                {isProgressing && !isPaused && (
                                                    <span className="metric-speed">
                                                        • 🚀 {dl.speed || '0 KB/s'}
                                                    </span>
                                                )}
                                                <span className="metric-percent">
                                                    • {dl.percent || 0}%
                                                </span>
                                            </div>
                                            <div className="metrics-right">
                                                <span className="metric-time">
                                                    {new Date(dl.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="download-actions">
                                        {isProgressing && (
                                            <>
                                                {isPaused ? (
                                                    <button 
                                                        className="dl-btn resume-btn" 
                                                        title="Resume Download"
                                                        onClick={() => onResumeDownload && onResumeDownload(dl.id)}
                                                    >
                                                        ▶ Resume
                                                    </button>
                                                ) : (
                                                    <button 
                                                        className="dl-btn pause-btn" 
                                                        title="Pause Download"
                                                        onClick={() => onPauseDownload && onPauseDownload(dl.id)}
                                                    >
                                                        ⏸ Pause
                                                    </button>
                                                )}
                                                <button 
                                                    className="dl-btn cancel-btn" 
                                                    title="Cancel Download"
                                                    onClick={() => onCancelDownload && onCancelDownload(dl.id)}
                                                >
                                                    ✕ Cancel
                                                </button>
                                            </>
                                        )}

                                        {isCompleted && (
                                            <>
                                                <button 
                                                    className="dl-btn folder-btn" 
                                                    title="Show file in Windows Explorer folder"
                                                    onClick={() => onShowInFolder && onShowInFolder(dl.savePath)}
                                                >
                                                    📂 Show in Folder
                                                </button>
                                                <button 
                                                    className="dl-btn open-btn" 
                                                    title="Open downloaded file directly"
                                                    onClick={() => onOpenFile && onOpenFile(dl.savePath)}
                                                >
                                                    Open
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
