package com.tonyai.ictcloud;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.ValueCallback;
import android.webkit.DownloadListener;
import android.widget.Button;
import android.widget.TextView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Toast;

/**
 * Separate Android CLIENT for the existing HTTPS ICT Cloud website.
 * No @JavascriptInterface / native bridge / local copy of school records.
 * Users authenticate against the same cloud backend as Windows/Chrome.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://antoun1972.github.io/tony-ai-coptic-api/";
    private static final String HOST = "antoun1972.github.io";
    private static final String PATH_PREFIX = "/tony-ai-coptic-api/";
    private static final int FILE_REQUEST = 741;

    private WebView page;
    private TextView status;
    private FrameLayout errorBox;
    private ValueCallback<Uri[]> fileCallback;

    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        getWindow().setStatusBarColor(Color.rgb(20,44,73));
        getWindow().setNavigationBarColor(Color.rgb(20,44,73));
        WebView.setWebContentsDebuggingEnabled(false);
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);

        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.WHITE);

        LinearLayout bar=new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(12),0,dp(10),0);
        bar.setBackgroundColor(Color.rgb(23,47,76));

        TextView title=new TextView(this);
        title.setText("TONY AI  |  مدرس أول ICT");
        title.setTextColor(Color.WHITE);
        title.setTextSize(15);
        title.setTypeface(null,Typeface.BOLD);
        title.setGravity(Gravity.CENTER_VERTICAL);
        bar.addView(title,new LinearLayout.LayoutParams(0,dp(49),1));

        Button reload=toolbarButton("↻");
        reload.setContentDescription("إعادة تحميل الموقع");
        reload.setOnClickListener(v->reloadPage());
        bar.addView(reload,new LinearLayout.LayoutParams(dp(46),dp(45)));

        Button browser=toolbarButton("↗");
        browser.setContentDescription("فتح الموقع في المتصفح للطباعة وحفظ PDF");
        browser.setOnClickListener(v->openBrowser(Uri.parse(HOME)));
        bar.addView(browser,new LinearLayout.LayoutParams(dp(46),dp(45)));
        root.addView(bar,new LinearLayout.LayoutParams(-1,dp(49)));

        FrameLayout content=new FrameLayout(this);
        root.addView(content,new LinearLayout.LayoutParams(-1,0,1));
        page=new WebView(this);
        page.setBackgroundColor(Color.WHITE);
        page.setOverScrollMode(View.OVER_SCROLL_NEVER);
        content.addView(page,new FrameLayout.LayoutParams(-1,-1));

        errorBox=new FrameLayout(this);
        errorBox.setBackgroundColor(Color.rgb(245,247,251));
        LinearLayout error=new LinearLayout(this);
        error.setOrientation(LinearLayout.VERTICAL);
        error.setGravity(Gravity.CENTER);
        error.setPadding(dp(24),dp(24),dp(24),dp(24));
        TextView message=new TextView(this);
        message.setGravity(Gravity.CENTER);
        message.setTextColor(Color.rgb(23,47,76));
        message.setTextSize(16);
        message.setText(getString(R.string.offline_message));
        error.addView(message,new LinearLayout.LayoutParams(-1,dp(100)));
        Button retry=new Button(this);
        retry.setText("إعادة المحاولة");
        retry.setOnClickListener(v->reloadPage());
        error.addView(retry,new LinearLayout.LayoutParams(-1,dp(55)));
        FrameLayout.LayoutParams ep=new FrameLayout.LayoutParams(-1,-2,Gravity.CENTER);
        errorBox.addView(error,ep);
        errorBox.setVisibility(View.GONE);
        content.addView(errorBox,new FrameLayout.LayoutParams(-1,-1));

        status=new TextView(this);
        status.setTextSize(11);
        status.setTextColor(Color.rgb(86,108,130));
        status.setGravity(Gravity.CENTER);
        status.setBackgroundColor(Color.rgb(243,246,250));
        status.setText("متصل بنفس حساب موقع TONY AI Cloud");
        root.addView(status,new LinearLayout.LayoutParams(-1,dp(24)));

        configureWebView();
        setContentView(root);
        page.loadUrl(HOME);
    }

    private int dp(int n){return Math.round(n*getResources().getDisplayMetrics().density);}

    private Button toolbarButton(String label){
        Button b=new Button(this);
        b.setText(label);
        b.setTextSize(18);
        b.setTextColor(Color.WHITE);
        b.setAllCaps(false);
        b.setPadding(0,0,0,0);
        b.setBackgroundColor(Color.TRANSPARENT);
        return b;
    }

    private boolean isAllowedAppPage(Uri uri){
        return uri!=null && "https".equalsIgnoreCase(uri.getScheme()) &&
            HOST.equalsIgnoreCase(uri.getHost()) &&
            (uri.getPath()!=null && (uri.getPath().equals("/tony-ai-coptic-api") ||
                                      uri.getPath().startsWith(PATH_PREFIX)));
    }

    private boolean safeExternalHttps(Uri uri){
        return uri!=null && "https".equalsIgnoreCase(uri.getScheme()) &&
            uri.getHost()!=null;
    }

    private void openBrowser(Uri uri){
        if(!safeExternalHttps(uri)){
            Toast.makeText(this,getString(R.string.invalid_url),Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            Intent intent=new Intent(Intent.ACTION_VIEW,uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        }catch(ActivityNotFoundException ex){
            Toast.makeText(this,"لم يتم العثور على متصفح مناسب",Toast.LENGTH_SHORT).show();
        }
    }

    private void configureWebView(){
        WebSettings settings=page.getSettings();
        settings.setJavaScriptEnabled(true);   // Needed for React-like web UI and auth
        settings.setDomStorageEnabled(true);    // Session persistence within this app
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);   // Android Storage Access Framework picker
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSafeBrowsingEnabled(true);
        // Keep text selection and long-press paste enabled for WhatsApp messages.
        CookieManager.getInstance().setAcceptThirdPartyCookies(page,false);
        page.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request){
                Uri uri=request.getUrl();
                if(isAllowedAppPage(uri))return false;
                if(request.isForMainFrame())openBrowser(uri);
                return true;
            }
            @Override public void onPageFinished(WebView view,String url){
                if(isAllowedAppPage(Uri.parse(url))){
                    errorBox.setVisibility(View.GONE);
                    status.setText("TONY AI ICT Cloud · يحتاج إنترنت للمزامنة");
                }
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest req,WebResourceError err){
                if(req.isForMainFrame()){
                    errorBox.setVisibility(View.VISIBLE);
                    status.setText("تعذر الاتصال بالموقع");
                }
            }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,SslError error){
                handler.cancel(); // No bypass for invalid TLS certificates
                errorBox.setVisibility(View.VISIBLE);
                status.setText("تعذر التحقق من أمان الاتصال");
            }
        });
        page.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView w,ValueCallback<Uri[]> cb,FileChooserParams params){
                if(fileCallback!=null){fileCallback.onReceiveValue(null);}
                fileCallback=cb;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                try{
                    startActivityForResult(Intent.createChooser(intent,getString(R.string.file_picker)),FILE_REQUEST);
                    return true;
                }catch(Exception e){
                    fileCallback=null;
                    Toast.makeText(MainActivity.this,"تعذر فتح منتقي الملفات",Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });
        page.setDownloadListener((url,agent,disposition,mime,size)->{
            Uri uri;
            try{uri=Uri.parse(url);}catch(Exception e){return;}
            if(safeExternalHttps(uri))openBrowser(uri);
            else Toast.makeText(this,"للتحميل افتح الموقع في Chrome",Toast.LENGTH_LONG).show();
        });
    }

    private void reloadPage(){
        if(page!=null){
            errorBox.setVisibility(View.GONE);
            if(page.getUrl()==null)page.loadUrl(HOME);
            else page.reload();
        }
    }

    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(request==FILE_REQUEST){
            if(fileCallback!=null){
                Uri[] value=(result==RESULT_OK && data!=null && data.getData()!=null)
                  ?new Uri[]{data.getData()}:null;
                fileCallback.onReceiveValue(value);
                fileCallback=null;
            }
        }
    }

    @Override public void onBackPressed(){
        if(errorBox!=null && errorBox.getVisibility()==View.VISIBLE){reloadPage();return;}
        if(page!=null && page.canGoBack()){page.goBack();return;}
        super.onBackPressed();
    }

    @Override protected void onPause(){
        if(page!=null)page.onPause();
        super.onPause();
    }
    @Override protected void onResume(){
        super.onResume();
        if(page!=null)page.onResume();
    }
    @Override protected void onDestroy(){
        if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}
        if(page!=null){page.destroy();page=null;}
        super.onDestroy();
    }
}
