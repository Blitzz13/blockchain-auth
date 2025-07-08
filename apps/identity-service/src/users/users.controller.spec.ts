import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { UserUpdateDto } from '../dtos/UserUpdateDTO';
import { UserUpdatePasswordDTO } from '../dtos/UserUpdatePasswordDTO';

// Mock the external utility function since it's not part of the controller's dependencies
jest.mock('../utils/utils', () => ({
  extractBearerToken: jest.fn().mockResolvedValue('extracted.token'),
  assertDefined: jest.fn().mockReturnValue(true),
}));

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let authService: AuthService;

  // Mock services
  const mockUsersService = {
    findByUserId: jest.fn().mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    updateDetailsById: jest.fn().mockResolvedValue({
      id: 'user123',
      email: 'updated@example.com',
      username: 'updateduser',
      updatedAt: new Date(),
    }),
    updatePasswordById: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuthService = {
    getUserIdByToken: jest.fn().mockResolvedValue('user123'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
        Logger,
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserByToken', () => {
    it('should return user profile on success', async () => {
      const authHeader = 'Bearer token';
      const result = await controller.getUserByToken(authHeader);

      expect(authService.getUserIdByToken).toHaveBeenCalledWith(
        'extracted.token',
      );
      expect(usersService.findByUserId).toHaveBeenCalledWith('user123');
      expect(result.id).toBe('user123');
      expect(result.email).toBe('test@example.com');
    });

    it('should return user profile on success', async () => {
      const authHeader = 'Bearer token';
      const result = await controller.getUserByToken(authHeader);

      expect(authService.getUserIdByToken).toHaveBeenCalledWith(
        'extracted.token',
      );
      expect(usersService.findByUserId).toHaveBeenCalledWith('user123');
      expect(result.id).toBe('user123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw NOT_FOUND if userId is not found from token', async () => {
      mockAuthService.getUserIdByToken.mockResolvedValueOnce(null);
      const authHeader = 'Bearer token';

      await expect(controller.getUserByToken(authHeader)).rejects.toThrow(
        new HttpException(
          'Userid not found in token schema',
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw NOT_FOUND if user is not found by id', async () => {
      mockUsersService.findByUserId.mockResolvedValueOnce(null);
      const authHeader = 'Bearer token';

      await expect(controller.getUserByToken(authHeader)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('updateUserProfileByToken', () => {
    it('should update and return the user profile', async () => {
      const authHeader = 'Bearer token';
      const updateDto: UserUpdateDto = {
        email: 'updated@example.com',
        username: 'updateduser',
      };
      const result = await controller.updateUserProfileByToken(
        authHeader,
        updateDto,
      );

      expect(usersService.updateDetailsById).toHaveBeenCalledWith(
        'user123',
        updateDto,
      );
      expect(result.email).toBe('updated@example.com');
    });
  });

  describe('updateUserPasswordByToken', () => {
    it('should call the update password service method', async () => {
      const authHeader = 'Bearer token';
      const updatePasswordDto: UserUpdatePasswordDTO = {
        currentPassword: 'old',
        newPassword: 'new',
      };

      // Since the method returns void, we just check that it completes without error
      await expect(
        controller.updateUserPasswordByToken(authHeader, updatePasswordDto),
      ).resolves.toBeUndefined();

      expect(usersService.updatePasswordById).toHaveBeenCalledWith(
        'user123',
        updatePasswordDto,
      );
    });
  });
});
