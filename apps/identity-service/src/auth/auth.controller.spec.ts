import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRegisterDto } from '../dtos/UserRegisterDTO';
import { UserLoginDto } from '../dtos/UserLoginDTO';
import { RefreshTokenRequestDTO } from '../dtos/RefreshTokenRequestDTO';

// Mock the external utility function
jest.mock('../utils/utils', () => ({
  extractBearerToken: jest.fn().mockResolvedValue('extracted.token'),
  assertDefined: jest.fn().mockReturnValue(true),
}));

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  const mockUsersService = {
    create: jest.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }),
    login: jest.fn().mockResolvedValue({ accessToken: 'new.access.token' }),
    findByUserId: jest
      .fn()
      .mockResolvedValue({ id: '1', email: 'test@test.com', username: 'test' }),
  };

  const mockAuthService = {
    invalidateTokensByAccessToken: jest.fn().mockResolvedValue(null),
    isRefreshTokenValid: jest.fn().mockResolvedValue(true),
    getUserIdByRefreshToken: jest.fn().mockResolvedValue('user123'),
    generateTokens: jest
      .fn()
      .mockReturnValue({ accessToken: 'new.access.token', expiresIn: '3600s' }),
    refreshToken: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        Logger, // Provide logger if needed
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call usersService.create with the correct DTO', async () => {
      const userRegisterDto: UserRegisterDto = {
        email: 'test@test.com',
        password: 'password',
        username: 'test',
      };

      await controller.register(userRegisterDto);
      expect(usersService.create).toHaveBeenCalledWith(userRegisterDto);
    });
  });

  describe('login', () => {
    it('should call usersService.login with the correct DTO', async () => {
      const userLoginDto: UserLoginDto = {
        email: 'test@test.com',
        password: 'password',
      };

      await controller.login(userLoginDto);
      expect(usersService.login).toHaveBeenCalledWith(userLoginDto);
    });
  });

  describe('logout', () => {
    it('should invalidate the token', async () => {
      const authHeader = 'Bearer extracted.token';

      await controller.logout(authHeader);
      expect(authService.invalidateTokensByAccessToken).toHaveBeenCalledWith(
        'extracted.token',
      );
    });
  });

  describe('refresh', () => {
    it('should return a new access token for a valid refresh token', async () => {
      const refreshDto: RefreshTokenRequestDTO = {
        refreshToken: 'valid.refresh.token',
      };
      const response = await controller.refresh(refreshDto);

      expect(authService.isRefreshTokenValid).toHaveBeenCalledWith(
        refreshDto.refreshToken,
      );
      expect(response).toHaveProperty('accessToken', 'new.access.token');
    });

    it('should throw UnauthorizedException for an invalid refresh token', async () => {
      mockAuthService.isRefreshTokenValid.mockResolvedValueOnce(false);
      const refreshDto: RefreshTokenRequestDTO = {
        refreshToken: 'invalid.refresh.token',
      };

      await expect(controller.refresh(refreshDto)).rejects.toThrow(
        new HttpException(
          'Refresh token is not valid',
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });
  });
});
