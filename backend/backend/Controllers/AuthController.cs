using backend.DTOs;
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

    // Register with email/password
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Check if user already exists
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
            return BadRequest(new { message = "User with this email already exists" });

        var user = new AppUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            DisplayName = dto.Name
        };

        var result = await _userManager.CreateAsync(user, dto.Password);

        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(", ", result.Errors.Select(e => e.Description)) });

        var token = _tokenService.CreateToken(user);
        return Ok(new { token });
    }

    // Login with email/password
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password" });

        var result = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!result)
            return Unauthorized(new { message = "Invalid email or password" });

        var token = _tokenService.CreateToken(user);
        return Ok(new { token });
    }
}
