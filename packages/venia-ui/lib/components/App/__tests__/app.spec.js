import React from 'react';
import { createTestInstance } from '@magento/peregrine';

import Main from '../../Main';
import Mask from '../../Mask';
import MiniCart from '../../MiniCart';
import Navigation from '../../Navigation';

jest.mock('../../Head', () => ({
    HeadProvider: ({ children }) => <div>{children}</div>,
    Title: () => 'Title'
}));
jest.mock('../../Main', () => 'Main');
jest.mock('../../MiniCart', () => 'MiniCart');
jest.mock('../../Navigation', () => 'Navigation');
jest.mock('../../ToastContainer', () => 'ToastContainer');

Object.defineProperty(window.location, 'reload', {
    configurable: true
});

const mockAddToast = jest.fn();
jest.mock('@magento/peregrine', () => {
    const useToasts = jest.fn(() => [
        { toasts: new Map() },
        { addToast: mockAddToast }
    ]);

    return {
        ...jest.requireActual('@magento/peregrine'),
        useToasts
    };
});

jest.mock('../../../util/createErrorRecord', () => ({
    __esModule: true,
    default: jest.fn().mockReturnValue({
        error: { message: 'A render error', stack: 'errorStack' },
        id: '1',
        loc: '1'
    })
}));

window.location.reload = jest.fn();

class Routes extends React.Component {
    render() {
        return null;
    }
}
jest.doMock('../renderRoutes', () => () => <Routes />);

// require app after mock is complete
const App = require('../app').default;

const getAndConfirmProps = (parent, type, props = {}) => {
    const instance = parent.findByType(type);
    expect(instance.props).toMatchObject(props);
    return instance;
};

afterAll(() => window.location.reload.mockRestore());

test('renders a full page with onlineIndicator and routes', () => {
    const appProps = {
        app: {
            drawer: '',
            overlay: false,
            hasBeenOffline: true,
            isOnline: false
        },
        closeDrawer: jest.fn(),
        markErrorHandled: jest.fn(),
        unhandledErrors: []
    };
    const { root } = createTestInstance(<App {...appProps} />);

    getAndConfirmProps(root, Navigation);
    getAndConfirmProps(root, MiniCart, { isOpen: false });

    const main = getAndConfirmProps(root, Main, {
        isMasked: false
    });

    // hasBeenOffline means onlineIndicator
    getAndConfirmProps(root, Main, { isOnline: false });
    // renderRoutes should just return a fake component here
    expect(main.findByType(Routes)).toBeTruthy();

    const mask = getAndConfirmProps(root, Mask, {
        isActive: false,
        dismiss: appProps.closeDrawer
    });

    // appropriate positioning
    const {
        parent: { children: siblings }
    } = main;
    expect(siblings.indexOf(main)).toBeLessThan(siblings.indexOf(mask));
});

test('displays onlineIndicator online if hasBeenOffline', () => {
    const appProps = {
        app: {
            drawer: '',
            overlay: false,
            hasBeenOffline: true,
            isOnline: true
        },
        closeDrawer: jest.fn(),
        markErrorHandled: jest.fn(),
        unhandledErrors: []
    };

    const { root } = createTestInstance(<App {...appProps} />);
    // hasBeenOffline means onlineIndicator
    getAndConfirmProps(root, Main, { isOnline: true });
});

test('displays open nav or drawer', () => {
    const propsWithDrawer = drawer => ({
        app: {
            drawer,
            overlay: false,
            hasBeenOffline: false,
            isOnline: false
        },
        closeDrawer: jest.fn(),
        markErrorHandled: jest.fn(),
        unhandledErrors: []
    });

    const { root: openNav } = createTestInstance(
        <App {...propsWithDrawer('nav')} />
    );

    getAndConfirmProps(openNav, Navigation);

    const { root: openCart } = createTestInstance(
        <App {...propsWithDrawer('cart')} />
    );

    getAndConfirmProps(openCart, MiniCart, { isOpen: true });
});

test('renders with renderErrors', () => {
    const appProps = {
        app: {
            drawer: '',
            overlay: false,
            hasBeenOffline: true,
            isOnline: false
        },
        closeDrawer: jest.fn(),
        markErrorHandled: jest.fn(),
        unhandledErrors: [],
        renderError: new Error('A render error!')
    };

    const { root } = createTestInstance(<App {...appProps} />);

    expect(root).toMatchSnapshot();
});

test('renders with unhandledErrors', () => {
    const appProps = {
        app: {
            drawer: '',
            overlay: false,
            hasBeenOffline: true,
            isOnline: false
        },
        closeDrawer: jest.fn(),
        markErrorHandled: jest.fn(),
        unhandledErrors: [{ error: new Error('A render error!') }],
        renderError: null
    };

    const { root } = createTestInstance(<App {...appProps} />);

    expect(root).toMatchSnapshot();
});

test('adds no toasts when no errors are present', () => {
    const appProps = {
        app: {
            drawer: '',
            overlay: false,
            hasBeenOffline: false,
            isOnline: true
        },
        closeDrawer: jest.fn(),
        markErrorHandled: jest.fn(),
        unhandledErrors: [],
        renderError: null
    };

    createTestInstance(<App {...appProps} />);

    expect(mockAddToast).not.toHaveBeenCalled();
});

test('adds toasts for render errors', () => {
    const appProps = {
        app: {
            drawer: '',
            overlay: false,
            hasBeenOffline: true,
            isOnline: false
        },
        closeDrawer: jest.fn(),
        markErrorHandled: jest.fn(),
        unhandledErrors: [],
        renderError: new Error('A render error!')
    };

    createTestInstance(<App {...appProps} />);

    expect(mockAddToast).toHaveBeenCalledWith({
        icon: expect.any(Object),
        message: expect.any(String),
        onDismiss: expect.any(Function),
        timeout: expect.any(Number),
        type: 'error'
    });
});

test('adds toasts for unhandled errors', () => {
    const appProps = {
        app: {
            drawer: '',
            overlay: false,
            hasBeenOffline: true,
            isOnline: false
        },
        closeDrawer: jest.fn(),
        markErrorHandled: jest.fn(),
        unhandledErrors: [{ error: new Error('A render error!') }],
        renderError: null
    };

    createTestInstance(<App {...appProps} />);

    expect(mockAddToast).toHaveBeenCalledWith({
        icon: expect.any(Object),
        message: expect.any(String),
        onDismiss: expect.any(Function),
        timeout: expect.any(Number),
        type: 'error'
    });
});
