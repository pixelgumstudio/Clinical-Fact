// Disable the automatic hooks from @testing-library/react-native
// since this test file defines its own beforeEach/afterEach
jest.disableAutomock();

// React 19 requires the test environment to explicitly opt in to act()-wrapped
// updates; without this, renderHook()/render() calls warn and result.current
// never populates. See https://react.dev/warnings/react-dom-test-utils.
global.IS_REACT_ACT_ENVIRONMENT = true;
