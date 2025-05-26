/**
 * 번역 백업 관리 도구
 * 번역 파일의 백업 생성, 복원, 정리 등을 관리
 */

import { BaseTool } from './base-tool.js';
import { ToolContext } from '../../types/index.js';
import { FileUpdaterService } from '../../services/file-updater.js';

interface ManageTranslationBackupsInput {
  action: 'list' | 'create' | 'restore' | 'cleanup' | 'validate';
  backupPath?: string;
  keepCount?: number;
}

interface ManageTranslationBackupsOutput {
  action: string;
  success: boolean;
  result: {
    backups?: string[];
    backupPath?: string;
    validationResult?: {
      isValid: boolean;
      errors: string[];
    };
    cleanupResult?: {
      deleted: number;
      remaining: number;
    };
  };
  message: string;
}

/**
 * 번역 백업 관리 도구
 */
export class ManageTranslationBackupsTool extends BaseTool {
  name = 'manage-translation-backups';
  description = '번역 파일의 백업을 생성, 복원, 관리합니다';

  inputSchema = {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'create', 'restore', 'cleanup', 'validate'],
        description: '실행할 작업 (list: 목록 조회, create: 백업 생성, restore: 복원, cleanup: 정리, validate: 검증)'
      },
      backupPath: {
        type: 'string',
        description: 'restore 작업 시 복원할 백업 경로'
      },
      keepCount: {
        type: 'number',
        description: 'cleanup 작업 시 유지할 백업 개수 (기본: 10)',
        default: 10
      }
    },
    required: ['action'],
    additionalProperties: false
  } as const;

  private fileUpdater: FileUpdaterService;

  constructor(context: ToolContext) {
    super(context);
    this.fileUpdater = new FileUpdaterService(context.config);
  }

  async execute(input: ManageTranslationBackupsInput): Promise<ManageTranslationBackupsOutput> {
    try {
      console.log(`🔧 백업 관리 작업 시작: ${input.action}`);

      switch (input.action) {
        case 'list':
          return await this.listBackups();
        
        case 'create':
          return await this.createBackup();
        
        case 'restore':
          if (!input.backupPath) {
            throw new Error('복원할 백업 경로가 필요합니다');
          }
          return await this.restoreBackup(input.backupPath);
        
        case 'cleanup':
          return await this.cleanupBackups(input.keepCount || 10);
        
        case 'validate':
          return await this.validateFiles();
        
        default:
          throw new Error(`지원하지 않는 작업입니다: ${input.action}`);
      }

    } catch (error) {
      return {
        action: input.action,
        success: false,
        result: {},
        message: `백업 관리 실패: ${error}`
      };
    }
  }

  /**
   * 백업 목록 조회
   */
  private async listBackups(): Promise<ManageTranslationBackupsOutput> {
    const backups = await this.fileUpdater.listBackups();
    
    return {
      action: 'list',
      success: true,
      result: { backups },
      message: `${backups.length}개의 백업을 발견했습니다`
    };
  }

  /**
   * 새 백업 생성
   */
  private async createBackup(): Promise<ManageTranslationBackupsOutput> {
    const backupPath = await this.fileUpdater.createBackup();
    
    return {
      action: 'create',
      success: true,
      result: { backupPath },
      message: `백업이 생성되었습니다: ${backupPath}`
    };
  }

  /**
   * 백업 복원
   */
  private async restoreBackup(backupPath: string): Promise<ManageTranslationBackupsOutput> {
    await this.fileUpdater.restoreFromBackup(backupPath);
    
    return {
      action: 'restore',
      success: true,
      result: { backupPath },
      message: `백업이 복원되었습니다: ${backupPath}`
    };
  }

  /**
   * 오래된 백업 정리
   */
  private async cleanupBackups(keepCount: number): Promise<ManageTranslationBackupsOutput> {
    const beforeList = await this.fileUpdater.listBackups();
    await this.fileUpdater.cleanupOldBackups(keepCount);
    const afterList = await this.fileUpdater.listBackups();
    
    const deleted = beforeList.length - afterList.length;
    
    return {
      action: 'cleanup',
      success: true,
      result: {
        cleanupResult: {
          deleted,
          remaining: afterList.length
        }
      },
      message: `${deleted}개의 오래된 백업을 정리했습니다 (${afterList.length}개 유지)`
    };
  }

  /**
   * 파일 구조 검증
   */
  private async validateFiles(): Promise<ManageTranslationBackupsOutput> {
    const validationResult = await this.fileUpdater.validateFileStructure();
    
    return {
      action: 'validate',
      success: validationResult.isValid,
      result: { validationResult },
      message: validationResult.isValid 
        ? '번역 파일 구조가 정상입니다'
        : `파일 구조 오류: ${validationResult.errors.join(', ')}`
    };
  }
} 