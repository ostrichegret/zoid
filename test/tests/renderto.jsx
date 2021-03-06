/* @flow */
/* eslint max-lines: off */
/** @jsx node */

import { onCloseWindow, getParent, getOpener, isWindowClosed } from 'cross-domain-utils/src';
import { wrapPromise, destroyElement } from 'belter/src';
import { node, dom } from 'jsx-pragmatic/src';

import { onWindowOpen } from '../common';

describe('zoid renderto cases', () => {

    it('should render a component to the parent as an iframe and call a prop', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-iframe-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:    'test-renderto-iframe-remote',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    })
                };
            };

            return window.__component__().simple({
                foo: expect('foo'),

                run: () => {
                    onWindowOpen().then(expect('onWindowOpen', win => {
                        if (getParent(win) !== window) {
                            throw new Error(`Expected window parent to be current window`);
                        }
                    }));

                    return `
                        window.__component__().remote({
                            foo: window.xprops.foo,

                            run: \`
                                window.xprops.foo();
                            \`
                        }).renderTo(window.parent, 'body');
                    `;
                }
            }).render(document.body);
        });
    });

    it('should render a component to the parent as a popup and call a prop', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-popup-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:    'test-renderto-popup-remote',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    })
                };
            };

            return window.__component__().simple({
                foo: expect('foo'),

                run() : string {
                    onWindowOpen({ win: this.source }).then(expect('onWindowOpen', win => {
                        if (getOpener(win) !== this.source) {
                            throw new Error(`Expected window opener to be child frame`);
                        }
                    }));

                    return `
                        window.__component__().remote({
                            foo: window.xprops.foo,

                            run: \`
                                window.xprops.foo();
                            \`
                        }).renderTo(window.parent, 'body', window.zoid.CONTEXT.POPUP);
                    `;
                }
            }).render(document.body);
        });
    });

    it('should prerender to a remotely rendered popup', () => {
        return wrapPromise(({ expect }) => {
            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-prerender-popup-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:               'test-renderto-prerender-popup-remote',
                        url:               '/base/test/windows/child/index.htm',
                        domain:            'mock://www.child.com',
                        prerenderTemplate: ({ doc }) => {
                            const html = doc.createElement('html');
                            const body = doc.createElement('body');
                            const script = doc.createElement('script');
                            script.text = `
                                window.opener.prerenderScriptLoaded();
                            `;
                            html.appendChild(body);
                            body.appendChild(script);
                            return html;
                        }
                    })
                };
            };

            return window.__component__().simple({
                prerenderScriptLoaded: expect('prerenderScriptLoaded'),

                run: expect('run', () => {
                    return `
                        window.prerenderScriptLoaded = window.xprops.prerenderScriptLoaded;
                        window.__component__().remote().renderTo(window.parent, 'body', zoid.CONTEXT.POPUP);
                    `;
                })
            }).render(document.body);
        }, { timeout: 5000 });
    });

    it('should prerender to a remotely rendered iframe', () => {
        return wrapPromise(({ expect }) => {
            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-prerender-iframe-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:               'test-renderto-prerender-iframe-remote',
                        url:               '/base/test/windows/child/index.htm',
                        domain:            'mock://www.child.com',
                        prerenderTemplate: ({ doc }) => {
                            const html = doc.createElement('html');
                            const body = doc.createElement('body');
                            const script = doc.createElement('script');
                            script.text = `
                                window.parent.prerenderScriptLoaded();
                            `;
                            html.appendChild(body);
                            body.appendChild(script);
                            return html;
                        }
                    })
                };
            };

            window.prerenderScriptLoaded = expect('prerenderScriptLoaded');

            return window.__component__().simple({
                run: expect('run', () => {
                    return `
                        window.__component__().remote().renderTo(window.parent, 'body');
                    `;
                })
            }).render(document.body);
        }, { timeout: 5000 });
    });

    it('should render a component to the parent as an iframe and close after a delay', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-close-iframe-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:    'test-renderto-close-iframe-remote',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    })
                };
            };

            let componentWindow;

            return window.__component__().simple({
                onClose: expect('onClose', () => {
                    if (!isWindowClosed(componentWindow)) {
                        throw new Error(`Expected component window to be closed`);
                    }
                }),

                run: () => {
                    onWindowOpen().then(expect('onWindowOpen', win => {
                        componentWindow = win;
                    }));

                    return `
                        window.__component__().remote({
                            onClose: function() {
                                setTimeout(() => {
                                    window.frameElement.parentNode.removeChild(window.frameElement)
                                }, 100);
                            },

                            run: \`
                                setTimeout(() => {
                                    window.frameElement.parentNode.removeChild(window.frameElement)
                                }, 100);
                            \`
                        }).renderTo(window.parent, 'body');
                    `;
                }
            }).render(document.body);
        }, { timeout: 5000 });
    });

    it('should render a component to the parent as a popup and close after a delay', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-close-popup-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:    'test-renderto-close-popup-remote',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    })
                };
            };

            let componentWindow;

            return window.__component__().simple({
                onClose: expect('onClose', () => {
                    if (!isWindowClosed(componentWindow)) {
                        throw new Error(`Expected component window to be closed`);
                    }
                }),

                run() : string {
                    onWindowOpen({ win: this.source }).then(expect('onWindowOpen', win => {
                        componentWindow = win;
                    }));

                    return `
                        window.__component__().remote({
                            onClose: function() {
                                setTimeout(() => {
                                    window.frameElement.parentNode.removeChild(window.frameElement);
                                }, 100);
                            },

                            run: \`
                                setTimeout(() => {
                                    window.close();
                                }, 100);
                            \`
                        }).renderTo(window.parent, 'body', zoid.CONTEXT.POPUP);
                    `;
                }
            }).render(document.body);
        }, { timeout: 5000 });
    });

    it('should close a zoid renderToParent iframe on call of close from prerender template', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-prerender-close-iframe-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:               'test-renderto-prerender-close-iframe-remote',
                        url:               '/base/test/windows/child/index.htm',
                        domain:            'mock://www.child.com',
                        prerenderTemplate: ({ close }) => {
                            const html = document.createElement('html');
                            const body = document.createElement('body');
                            html.appendChild(body);
                            setTimeout(close, 300);
                            return html;
                        }
                    })
                };
            };

            return window.__component__().simple({
                run: () => {
                    onWindowOpen().then(expect('onWindowOpen', win => {
                        onCloseWindow(win, expect('onCloseWindow'), 50);
                    }));

                    return `
                        window.__component__().remote().renderTo(window.parent, 'body');
                    `;
                }
            }).render(document.body);
        }, { timeout: 5000 });
    });

    it('should close a zoid renderToParent popup on call of close from prerender template', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-prerender-close-popup-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:               'test-renderto-prerender-close-popup-remote',
                        url:               '/base/test/windows/child/index.htm',
                        domain:            'mock://www.child.com',
                        prerenderTemplate: ({ close }) => {
                            const html = document.createElement('html');
                            const body = document.createElement('body');
                            html.appendChild(body);
                            setTimeout(close, 300);
                            return html;
                        }
                    })
                };
            };

            return window.__component__().simple({
                run: () => {
                    onWindowOpen().then(expect('onWindowOpen', win => {
                        onCloseWindow(win, expect('onCloseWindow'), 50);
                    }));

                    return `
                        window.__component__().remote().renderTo(window.parent, 'body', zoid.CONTEXT.POPUP);
                    `;
                }
            }).render(document.body);
        }, { timeout: 5000 });
    });

    it('should focus a zoid renderToParent popup on call of focus from container template', () => {
        return wrapPromise(({ expect }) => {
            let doFocus;

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-container-focus-popup-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:               'test-renderto-container-focus-popup-remote',
                        url:               '/base/test/windows/child/index.htm',
                        domain:            'mock://www.child.com',
                        containerTemplate: ({ doc, focus }) => {
                            doFocus = focus;

                            return (
                                <div />
                            ).render(dom({ doc }));
                        }
                    })
                };
            };

            return window.__component__().simple({
                doFocus: expect('doFocus', () => doFocus()),
                onFocus: expect('onFocus'),

                run: expect('run', () => {
                    return `
                        let win;

                        let winOpen = window.open;
                        window.open = function windowOpen() {
                            win = winOpen.apply(this, arguments);
                            return win;
                        }

                        window.__component__().remote().renderTo(window.parent, 'body', zoid.CONTEXT.POPUP).then(() => {
                            win.focus = window.xprops.onFocus;
                            return window.xprops.doFocus();
                        });
                    `;
                })
            }).render(document.body);
        }, { timeout: 5000 });
    });

    it('should focus a zoid renderToParent popup on call of focus from prerender template', () => {
        return wrapPromise(({ expect }) => {
            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-prerender-focus-popup-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:               'test-renderto-prerender-focus-popup-remote',
                        url:               '/base/test/windows/child/index.htm',
                        domain:            'mock://www.child.com',
                        prerenderTemplate: ({ doc, focus }) => {
                            const html = doc.createElement('html');
                            const body = doc.createElement('body');
                            html.appendChild(body);
                            window.doFocus = focus;
                            return html;
                        }
                    })
                };
            };

            return window.__component__().simple({
                onFocus: expect('onFocus'),

                run: expect('run', () => {
                    return `
                        let win;

                        let winOpen = window.open;
                        window.open = function windowOpen() {
                            win = winOpen.apply(this, arguments);
                            return win;
                        }

                        window.__component__().remote().renderTo(window.parent, 'body', zoid.CONTEXT.POPUP).then(() => {
                            win.focus = window.xprops.onFocus;
                            window.doFocus();
                        });
                    `;
                })
            }).render(document.body);
        }, { timeout: 5000 });
    });

    it('should error out when trying to renderTo with an element reference', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-element-reference-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:    'test-renderto-element-reference-remote',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    })
                };
            };

            return window.__component__().simple({
                childRenderError: expect('childRenderError'),

                run: () => {
                    return `
                        window.__component__().remote().renderTo(window.parent, document.body)
                            .catch(window.xprops.childRenderError);
                    `;
                }
            }).render(document.body);
        });
    });

    it('should error out when trying to renderTo to a different popup', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-different-popup-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:    'test-renderto-different-popup-remote',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.foobar.com'
                    })
                };
            };

            return window.__component__().simple({
                childRenderError: expect('childRenderError'),

                run: () => {
                    return `
                        const win = window.open('', '', 'width=500,height=500');

                        window.__component__().remote().renderTo(win, 'body')
                            .catch(err => {
                                win.close();
                                return window.xprops.childRenderError(err);
                            });
                    `;
                }
            }).render(document.body);
        });
    });

    it('should error out when using renderto with a different domain to the current domain', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-iframe-different-domain-error-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:    'test-renderto-iframe-different-domain-error-remote',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.foobar.com'
                    })
                };
            };

            return window.__component__().simple({
                childRenderError: expect('childRenderError'),

                run: () => {
                    return `
                        window.__component__().remote().renderTo(window.parent, 'body')
                            .catch(window.xprops.childRenderError);
                    `;
                }
            }).render(document.body);
        });
    });

    it('should error out when using renderto with an iframe without the component loaded', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-iframe-bad-window-error-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    })
                };
            };

            return window.__component__().simple({
                childRenderError: expect('childRenderError'),

                run: () => {
                    return `
                        const remoteComponent = window.zoid.create({
                            tag:    'test-renderto-iframe-bad-window-error-remote',
                            url:    'mock://www.child.com/base/test/windows/child/index.htm',
                            domain: 'mock://www.child.com'
                        });

                        remoteComponent().renderTo(window.parent, 'body')
                            .catch(window.xprops.childRenderError);
                    `;
                }
            }).render(document.body);
        });
    });

    it('should render a component to the parent as an iframe and close when the original window closes', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-close-on-parent-close-iframe-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:    'test-renderto-close-on-parent-close-iframe-remote',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    })
                };
            };

            let simpleWindow;
            let remoteWindow;

            onWindowOpen().then(expect('onSimpleWindowOpen', win => {
                simpleWindow = win;
            }));

            return window.__component__().simple({

                onLoad: expect('onLoad', () => {
                    onWindowOpen().then(expect('onRemoteWindowOpen', win => {
                        remoteWindow = win;
                    }));
                }),

                onRemoteLoad: expect('onRemoteLoad', () => {
                    if (!remoteWindow) {
                        throw new Error(`Expected remote window to be populated`);
                    }

                    // $FlowFixMe
                    destroyElement(simpleWindow.frameElement);
                    return onCloseWindow(remoteWindow, expect('onCloseWindow'));
                }),

                run: () => {
                    return `
                        return window.xprops.onLoad().then(() => {
                            return window.__component__().remote().renderTo(window.parent, 'body');
                        }).then(() => {
                            return window.xprops.onRemoteLoad();
                        });
                    `;
                }
            }).render(document.body);
        }, { timeout: 5000 });
    });

    it('should get a successful result from canrenderto', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-canrenderto-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:    'test-renderto-canrenderto-remote',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    })
                };
            };

            return window.__component__().simple({
                canRenderToResult: expect('canRenderTo', result => {
                    if (result !== true) {
                        throw new Error(`Expected positive result for canRenderTo`);
                    }
                }),

                run: () => {
                    return `
                        window.__component__().remote.canRenderTo(window.parent)
                            .then(window.xprops.canRenderToResult)
                    `;
                }
            }).render(document.body);
        });
    });

    it('should get a negative result from canrenderto', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-canrenderto-negative-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    })
                };
            };

            return window.__component__().simple({
                canRenderToResult: expect('canRenderTo', result => {
                    if (result !== false) {
                        throw new Error(`Expected negative result for canRenderTo`);
                    }
                }),

                run: () => {
                    return `
                        const component = window.zoid.create({
                            tag:    'test-renderto-canrenderto-negative-remote',
                            url:    'mock://www.child.com/base/test/windows/child/index.htm',
                            domain: 'mock://www.child.com'
                        });

                        component.canRenderTo(window.parent)
                            .then(window.xprops.canRenderToResult)
                    `;
                }
            }).render(document.body);
        });
    });

    it('should render a component to the parent as an iframe inside an iframe and call a prop', () => {
        return wrapPromise(({ expect }) => {

            window.__component__ = () => {
                return {
                    simple: window.zoid.create({
                        tag:    'test-renderto-iframe-in-iframe-simple',
                        url:    'mock://www.child.com/base/test/windows/child/index.htm',
                        domain: 'mock://www.child.com'
                    }),

                    remote: window.zoid.create({
                        tag:               'test-renderto-iframe-in-iframe-remote',
                        url:               'mock://www.child.com/base/test/windows/child/index.htm',
                        domain:            'mock://www.child.com',
                        containerTemplate: ({ doc, frame, prerenderFrame }) => {
                            return (
                                <div>
                                    <iframe>
                                        <html>
                                            <body>
                                                <node el={ frame } />
                                                <node el={ prerenderFrame } />
                                            </body>
                                        </html>
                                    </iframe>
                                </div>
                            ).render(dom({ doc }));
                        }
                    })
                };
            };

            return window.__component__().simple({
                foo: expect('foo'),

                run: () => {
                    return `
                        window.__component__().remote({
                            foo: window.xprops.foo,

                            run: \`
                                window.xprops.foo();
                            \`
                        }).renderTo(window.parent, 'body');
                    `;
                }
            }).render(document.body);
        });
    });
});
