import React from 'react';

/**
 * Universal React Error Boundary for Nexora Browser
 * Prevents any component, custom element, or renderer exception from crashing the whole browser window.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[Nexora ErrorBoundary Caught]:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleRecover = () => {
        try {
            // Clear any corrupted custom element overrides if necessary
            this.setState({ hasError: false, error: null, errorInfo: null });
        } catch (e) {
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="antigravity-error-boundary-fallback" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '200px',
                    padding: '24px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    border: '1.5px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '12px',
                    margin: '16px',
                    color: '#f8fafc',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>⚠️</div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#f87171' }}>
                        {this.props.title || 'Component Recovered from Runtime Error'}
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#94a3b8', maxWidth: '480px', textAlign: 'center' }}>
                        {this.state.error ? this.state.error.message : 'An unexpected exception occurred during element rendering.'}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={this.handleRecover}
                            style={{
                                background: '#00e5ff',
                                color: '#070b14',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer'
                            }}
                        >
                            ↺ Recover UI
                        </button>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: '#e2e8f0',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Reload Window
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
