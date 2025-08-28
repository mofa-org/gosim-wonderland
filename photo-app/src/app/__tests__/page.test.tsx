import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PhotoApp from '../page'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Camera: () => <div data-testid="camera-icon" />,
  RotateCcw: () => <div data-testid="rotate-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  CheckCircle: () => <div data-testid="check-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />
}))

// Mock utils
jest.mock('@/lib/utils', () => ({
  generateSessionId: () => 'test-session-id'
}))

describe('PhotoApp', () => {
  beforeEach(() => {
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('should render welcome screen initially', () => {
    render(<PhotoApp />)
    
    expect(screen.getByText('GOSIM Wonderland')).toBeInTheDocument()
    expect(screen.getByText('拍照生成专属卡通头像')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /开始拍照/i })).toBeInTheDocument()
    expect(screen.getByTestId('camera-icon')).toBeInTheDocument()
  })

  it('should start camera when start button clicked', async () => {
    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }]
    }
    
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockStream)
    
    render(<PhotoApp />)
    
    const startButton = screen.getByRole('button', { name: /开始拍照/i })
    fireEvent.click(startButton)
    
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'user', width: 800, height: 600 }
      })
    })
  })

  it('should handle camera permission error', async () => {
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(
      new Error('Permission denied')
    )
    
    render(<PhotoApp />)
    
    const startButton = screen.getByRole('button', { name: /开始拍照/i })
    fireEvent.click(startButton)
    
    await waitFor(() => {
      expect(screen.getByText('出错了')).toBeInTheDocument()
      expect(screen.getByText('无法访问摄像头，请检查权限设置')).toBeInTheDocument()
      expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
    })
  })

  it('should show uploading state', async () => {
    // Mock successful upload response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        photo: { id: 'test-id', status: 'pending' }
      })
    })

    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }]
    }
    
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockStream)
    
    // Mock canvas and video
    const mockContext = {
      drawImage: jest.fn()
    }
    
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext)
    HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue('data:image/jpeg;base64,test')
    
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      value: 800,
      writable: true
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      value: 600,
      writable: true
    })

    render(<PhotoApp />)
    
    // Start camera
    const startButton = screen.getByRole('button', { name: /开始拍照/i })
    fireEvent.click(startButton)
    
    await waitFor(() => {
      expect(screen.getByText('拍照')).toBeInTheDocument()
    })

    // Take photo
    const takePhotoButton = screen.getByText('拍照')
    fireEvent.click(takePhotoButton)

    await waitFor(() => {
      expect(screen.getByText('生成头像')).toBeInTheDocument()
    })

    // Upload photo
    const uploadButton = screen.getByText('生成头像')
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText('上传中...')).toBeInTheDocument()
    })
  })

  it('should handle upload error', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: false,
        error: '上传失败'
      })
    })

    const mockStream = {
      getTracks: () => [{ stop: jest.fn() }]
    }
    
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockStream)
    
    // Mock canvas and video
    const mockContext = {
      drawImage: jest.fn()
    }
    
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext)
    HTMLCanvasElement.prototype.toDataURL = jest.fn().mockReturnValue('data:image/jpeg;base64,test')
    
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      value: 800,
      writable: true
    })
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      value: 600,
      writable: true
    })

    render(<PhotoApp />)
    
    // Navigate through the flow
    const startButton = screen.getByRole('button', { name: /开始拍照/i })
    fireEvent.click(startButton)
    
    await waitFor(() => {
      expect(screen.getByText('拍照')).toBeInTheDocument()
    })

    const takePhotoButton = screen.getByText('拍照')
    fireEvent.click(takePhotoButton)

    await waitFor(() => {
      expect(screen.getByText('生成头像')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('生成头像')
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText('出错了')).toBeInTheDocument()
      expect(screen.getByText('上传失败')).toBeInTheDocument()
    })
  })
})