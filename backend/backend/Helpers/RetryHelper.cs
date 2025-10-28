using backend.Misc;

namespace backend.Helpers;

public static class RetryHelper
{
    private const int DefaultMaxRetries = 3;
    private const int DefaultInitialDelayMs = 1000;
    private const int DefaultMaxDelayMs = 30000;

    public static async Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> operation,
        Logger logger,
        string operationName,
        int maxRetries = DefaultMaxRetries,
        int initialDelayMs = DefaultInitialDelayMs,
        int maxDelayMs = DefaultMaxDelayMs,
        CancellationToken cancellationToken = default)
    {
        int attempt = 0;
        while (true)
        {
            attempt++;
            try
            {
                return await operation();
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                if (attempt >= maxRetries)
                {
                    await logger.LogAsync(LogLevel.Error,
                        $"{operationName} failed after {maxRetries} attempts", ex);
                    throw;
                }

                var delay = Math.Min(initialDelayMs * (int)Math.Pow(2, attempt - 1), maxDelayMs);
                await logger.LogAsync(LogLevel.Warning,
                    $"{operationName} failed (attempt {attempt}/{maxRetries}). Retrying in {delay}ms... Error: {ex.Message}");

                await Task.Delay(delay, cancellationToken);
            }
        }
    }

    public static async Task ExecuteWithRetryAsync(
        Func<Task> operation,
        Logger logger,
        string operationName,
        int maxRetries = DefaultMaxRetries,
        int initialDelayMs = DefaultInitialDelayMs,
        int maxDelayMs = DefaultMaxDelayMs,
        CancellationToken cancellationToken = default)
    {
        await ExecuteWithRetryAsync(async () =>
        {
            await operation();
            return true;
        }, logger, operationName, maxRetries, initialDelayMs, maxDelayMs, cancellationToken);
    }
}
