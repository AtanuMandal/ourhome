using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;


namespace ApartmentManagement.Functions
{
    public class HttpContextAccessorMiddleware(IHttpContextAccessor httpContextAccessor) : IFunctionsWorkerMiddleware
    {
        public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
        {
            // Extension method available in Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore
            var httpContext = context.GetHttpContext();
            if (httpContext is null)
            {
                await next(context);
                return;
            }

            httpContextAccessor.HttpContext = httpContext;
            await PopulateUserAsync(httpContext);

            try
            {
                await next(context);
            }
            finally
            {
                httpContextAccessor.HttpContext = null;
            }
        }

        internal static async Task PopulateUserAsync(HttpContext httpContext)
        {
            if (!httpContext.Request.Headers.ContainsKey("Authorization") ||
                httpContext.User.Identity?.IsAuthenticated == true)
            {
                return;
            }

            var authResult = await httpContext.AuthenticateAsync(JwtBearerDefaults.AuthenticationScheme);
            if (authResult.Succeeded && authResult.Principal is not null)
                httpContext.User = authResult.Principal;
        }
    }

}
