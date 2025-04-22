const loggerModule = require('../logger');

describe('Logger Utility', () => {
    test('should log messages correctly', () => {
        // Mock the info method of the logger
        const infoSpy = jest.spyOn(loggerModule, 'info');
        
        // Call the logger
        loggerModule.info('Hello, World!');
        
        // Verify it was called with the correct argument
        expect(infoSpy).toHaveBeenCalledWith('Hello, World!');
        
        // Restore the original function
        infoSpy.mockRestore();
    });

    test('should log warnings correctly', () => {
        // Mock the warn method of the logger
        const warnSpy = jest.spyOn(loggerModule, 'warn');
        
        // Call the logger
        loggerModule.warn('Test Warning');
        
        // Verify it was called with the correct argument
        expect(warnSpy).toHaveBeenCalledWith('Test Warning');
        
        // Restore the original function
        warnSpy.mockRestore();
    });

    test('should log errors correctly', () => {
        // Mock the error method of the logger
        const errorSpy = jest.spyOn(loggerModule, 'error');
        
        // Call the logger
        loggerModule.error('Test Error');
        
        // Verify it was called with the correct argument
        expect(errorSpy).toHaveBeenCalledWith('Test Error');
        
        // Restore the original function
        errorSpy.mockRestore();
    });

    test('should log debug messages correctly', () => {
        // Mock the debug method of the logger
        const debugSpy = jest.spyOn(loggerModule, 'debug');
        
        // Call the logger
        loggerModule.debug('Debug information');
        
        // Verify it was called with the correct argument
        expect(debugSpy).toHaveBeenCalledWith('Debug information');
        
        // Restore the original function
        debugSpy.mockRestore();
    });
});
