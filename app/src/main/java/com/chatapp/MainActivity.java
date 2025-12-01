package com.chatapp;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.HashMap;
import java.util.Map;

public class MainActivity extends AppCompatActivity {

    private static final int REQUEST_PERMISSIONS = 100;
    private WebView webView;
    
    // WebView配置常量
    private static final boolean ENABLE_DEBUGGING = true;
    private static final String DEFAULT_WEB_URL = "file:///android_asset/index.html";
    // 可以从这里轻松切换到远程URL进行测试
    // private static final String DEFAULT_WEB_URL = "http://192.168.1.100:3000";
    
    // WebView配置选项
    private boolean javascriptEnabled = true;
    private boolean domStorageEnabled = true;
    private boolean databaseEnabled = true;
    private boolean allowFileAccess = true;
    private boolean allowContentAccess = true;
    private boolean mediaPlaybackRequiresUserGesture = false;
    private int cacheMode = WebSettings.LOAD_DEFAULT;
    private boolean mixedContentAllowed = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 初始化WebView
        initWebView();

        // 请求权限
        requestPermissions();
    }

    // 初始化WebView
    private void initWebView() {
        try {
            webView = findViewById(R.id.webView);
            
            // 启用WebView调试
            if (ENABLE_DEBUGGING) {
                WebView.setWebContentsDebuggingEnabled(true);
            }

            // 配置WebView设置
            configureWebViewSettings();
            
            // 设置WebView客户端
            setWebViewClients();

            // 添加JavaScript接口，暴露原生方法给WebView
            webView.addJavascriptInterface(new NativeBridge(this), "NativeApp");

            // 加载Web页面
            loadWebPage();
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "WebView初始化失败: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }
    
    // 配置WebView设置
    private void configureWebViewSettings() {
        WebSettings webSettings = webView.getSettings();
        
        // 应用配置选项
        webSettings.setJavaScriptEnabled(javascriptEnabled);
        webSettings.setDomStorageEnabled(domStorageEnabled);
        webSettings.setDatabaseEnabled(databaseEnabled);
        webSettings.setCacheMode(cacheMode);
        webSettings.setAllowFileAccess(allowFileAccess);
        webSettings.setAllowContentAccess(allowContentAccess);
        webSettings.setMediaPlaybackRequiresUserGesture(mediaPlaybackRequiresUserGesture);

        // 启用混合内容（允许HTTP和HTTPS混合）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && mixedContentAllowed) {
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
    
    // 设置WebView客户端
    private void setWebViewClients() {
        // 设置WebViewClient
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // 所有链接在当前WebView中打开
                view.loadUrl(url);
                return true;
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // 页面加载完成后可以执行的操作
                runOnUiThread(() -> {
                    // 例如：显示加载完成提示
                    // Toast.makeText(MainActivity.this, "页面加载完成", Toast.LENGTH_SHORT).show();
                });
            }
        });

        // 设置WebChromeClient（用于处理媒体权限请求和调试）
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, android.webkit.JsResult result) {
                // 处理JavaScript弹窗
                Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
                result.confirm();
                return true;
            }
            
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                // 可以在这里添加加载进度显示
                super.onProgressChanged(view, newProgress);
            }
        });
    }
    
    // 加载Web页面
    private void loadWebPage() {
        webView.loadUrl(DEFAULT_WEB_URL);
    }
    
    // 动态加载URL方法（可通过外部调用）
    public void loadUrl(String url) {
        if (webView != null) {
            webView.loadUrl(url);
        }
    }
    
    // 更新WebView配置
    public void updateWebViewConfig(boolean javascriptEnabled, boolean domStorageEnabled, boolean databaseEnabled) {
        this.javascriptEnabled = javascriptEnabled;
        this.domStorageEnabled = domStorageEnabled;
        this.databaseEnabled = databaseEnabled;
        
        // 重新配置WebView设置
        configureWebViewSettings();
    }

    // 请求权限
    private void requestPermissions() {
        String[] permissions = {
                Manifest.permission.INTERNET,
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
        };

        // 检查并请求未授予的权限
        boolean needRequest = false;
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                needRequest = true;
                break;
            }
        }

        if (needRequest) {
            ActivityCompat.requestPermissions(this, permissions, REQUEST_PERMISSIONS);
        }
    }

    // 处理权限请求结果
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_PERMISSIONS) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                Toast.makeText(this, "所有权限已授予", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "部分权限未授予，某些功能可能无法正常使用", Toast.LENGTH_SHORT).show();
            }
        }
    }

    // 原生方法桥接类
    public class NativeBridge {
        private Context context;

        public NativeBridge(Context context) {
            this.context = context;
        }

        // 获取设备信息
        @JavascriptInterface
        public String getDeviceInfo() {
            Map<String, String> deviceInfo = new HashMap<>();
            deviceInfo.put("model", Build.MODEL);
            deviceInfo.put("manufacturer", Build.MANUFACTURER);
            deviceInfo.put("version", Build.VERSION.RELEASE);
            deviceInfo.put("sdk", String.valueOf(Build.VERSION.SDK_INT));

            // 转换为JSON字符串
            StringBuilder json = new StringBuilder("{");
            for (Map.Entry<String, String> entry : deviceInfo.entrySet()) {
                json.append("\"").append(entry.getKey()).append("\":\"").append(entry.getValue()).append("\",");
            }
            json.deleteCharAt(json.length() - 1);
            json.append("}");

            return json.toString();
        }

        // 检查麦克风权限
        @JavascriptInterface
        public boolean checkMicrophonePermission() {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        }

        // 检查摄像头权限
        @JavascriptInterface
        public boolean checkCameraPermission() {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        }

        // 显示Toast消息
        @JavascriptInterface
        public void showToast(String message) {
            runOnUiThread(() -> {
                Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
            });
        }

        // 获取应用版本信息
        @JavascriptInterface
        public String getAppVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (PackageManager.NameNotFoundException e) {
                e.printStackTrace();
                return "1.0";
            }
        }
        
        // WebView配置相关方法
        
        // 获取当前WebView配置
        @JavascriptInterface
        public String getWebViewConfig() {
            Map<String, Object> config = new HashMap<>();
            config.put("javascriptEnabled", javascriptEnabled);
            config.put("domStorageEnabled", domStorageEnabled);
            config.put("databaseEnabled", databaseEnabled);
            config.put("allowFileAccess", allowFileAccess);
            config.put("allowContentAccess", allowContentAccess);
            config.put("mediaPlaybackRequiresUserGesture", mediaPlaybackRequiresUserGesture);
            config.put("cacheMode", cacheMode);
            config.put("mixedContentAllowed", mixedContentAllowed);
            
            // 转换为JSON字符串
            StringBuilder json = new StringBuilder("{");
            for (Map.Entry<String, Object> entry : config.entrySet()) {
                json.append('"').append(entry.getKey()).append('"').append(':');
                
                Object value = entry.getValue();
                if (value instanceof Boolean) {
                    json.append(value.toString());
                } else if (value instanceof Number) {
                    json.append(value.toString());
                } else {
                    json.append('"').append(value.toString()).append('"');
                }
                
                json.append(',');
            }
            json.deleteCharAt(json.length() - 1);
            json.append('}');
            
            return json.toString();
        }
        
        // 动态更新WebView配置
        @JavascriptInterface
        public void updateWebViewConfig(String configJson) {
            // 这里可以实现JSON解析和配置更新
            // 为了简化，我们先保持基本功能
            runOnUiThread(() -> {
                Toast.makeText(context, "WebView配置更新请求已接收", Toast.LENGTH_SHORT).show();
            });
        }
        
        // 重新加载当前页面
        @JavascriptInterface
        public void reloadPage() {
            runOnUiThread(() -> {
                if (webView != null) {
                    webView.reload();
                }
            });
        }
        
        // 加载指定URL
        @JavascriptInterface
        public void loadUrl(String url) {
            runOnUiThread(() -> {
                if (webView != null) {
                    webView.loadUrl(url);
                }
            });
        }
        
        // 后退
        @JavascriptInterface
        public void goBack() {
            runOnUiThread(() -> {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                }
            });
        }
        
        // 前进
        @JavascriptInterface
        public void goForward() {
            runOnUiThread(() -> {
                if (webView != null && webView.canGoForward()) {
                    webView.goForward();
                }
            });
        }
        
        // 清除缓存
        @JavascriptInterface
        public void clearCache() {
            runOnUiThread(() -> {
                if (webView != null) {
                    webView.clearCache(true);
                    webView.clearHistory();
                    webView.clearFormData();
                    Toast.makeText(context, "缓存已清除", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    // 处理返回键
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    // 生命周期管理
    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}