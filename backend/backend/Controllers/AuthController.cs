using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace backend.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly TokenService _tokenService;
    private readonly IConfiguration _config;

    public AuthController(UserManager<AppUser> userManager, TokenService tokenService, IConfiguration config)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _config = config;
    }

    // Step 1: redirect browser to Google login
    [HttpGet("google")]
    public IActionResult GoogleLogin()
    {
        var redirectUrl = Url.Action(nameof(GoogleCallback), "Auth");
        var properties = new AuthenticationProperties { RedirectUri = redirectUrl };
        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    // Step 2: Google calls us back here after login
    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback()
    {
        var result = await HttpContext.AuthenticateAsync(GoogleDefaults.AuthenticationScheme);
        if (!result.Succeeded)
            return BadRequest("Google authentication failed");

        var email = result.Principal.FindFirstValue(ClaimTypes.Email)!;
        var name = result.Principal.FindFirstValue(ClaimTypes.Name);
        var avatar = result.Principal.FindFirstValue("picture"); 

        // Find or create the user
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new AppUser
            {
                UserName = email,
                Email = email,
                DisplayName = name,
                AvatarUrl = avatar,
            };
            await _userManager.CreateAsync(user);
        }
        else
        {
            // Update name/avatar in case they changed on Google
            user.DisplayName = name;
            user.AvatarUrl = avatar;
            await _userManager.UpdateAsync(user);
        }

        var token = _tokenService.CreateToken(user);

        // Redirect to frontend with the token in the URL
        var frontendUrl = _config["Frontend:Url"] ?? "http://localhost:5173";
        return Redirect($"{frontendUrl}/auth/callback?token={token}");
    }
}
