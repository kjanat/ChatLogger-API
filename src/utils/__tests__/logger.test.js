const logger = require('../logger');

describe('Logger Utility', () => {
    test('should log messages correctly', () => {
        // Mock the info method of the logger
        const infoSpy = jest.spyOn(logger, 'info');
        
        // Call the logger
        logger.info('Hello, World!');
        
        // Verify it was called with the correct argument
        expect(infoSpy).toHaveBeenCalledWith('Hello, World!');
        
        // Restore the original function
        infoSpy.mockRestore();
    });

    test('should log warnings correctly', () => {
        // Mock the warn method of the logger
        const warnSpy = jest.spyOn(logger, 'warn');
        
        // Call the logger
        logger.warn('Test Warning');
        
        // Verify it was called with the correct argument
        expect(warnSpy).toHaveBeenCalledWith('Test Warning');
        
        // Restore the original function
        warnSpy.mockRestore();
    });

    test('should log errors correctly', () => {
        // Mock the error method of the logger
        const errorSpy = jest.spyOn(logger, 'error');
        
        // Call the logger
        logger.error('Test Error');
        
        // Verify it was called with the correct argument
        expect(errorSpy).toHaveBeenCalledWith('Test Error');
        
        // Restore the original function
        errorSpy.mockRestore();
    });

    test('should log debug messages correctly', () => {
        // Mock the debug method of the logger
        const debugSpy = jest.spyOn(logger, 'debug');
        
        // Call the logger
        logger.debug('Debug information');
        
        // Verify it was called with the correct argument
        expect(debugSpy).toHaveBeenCalledWith('Debug information');
        
        // Restore the original function
        debugSpy.mockRestore();
    });
});
