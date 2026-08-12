$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Drawing.Text;

public class IconGen {
    public static void CreateExactIcon(int size, string path) {
        using (Bitmap bmp = new Bitmap(size, size))
        using (Graphics g = Graphics.FromImage(bmp)) {
            // Fill 100% full rectangle with solid black #000000
            g.Clear(Color.Black);
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;

            // Calculate scale ratio relative to 512x512
            float scale = size / 512.0f;
            float fontSizeInPixels = 115.0f * scale;

            // Try "Inter", fallback to "Arial"
            FontFamily family;
            try {
                family = new FontFamily("Inter");
            } catch {
                family = new FontFamily("Arial");
            }

            using (Font font = new Font(family, fontSizeInPixels, FontStyle.Bold, GraphicsUnit.Pixel))
            using (StringFormat sf = new StringFormat()) {
                sf.Alignment = StringAlignment.Center;
                sf.LineAlignment = StringAlignment.Near; // baseline relative

                // Draw white text "WatchIt" centered
                // In SVG: y=295 for 115px font in 512 height (around 52% down from top)
                float topOffset = (295.0f - (fontSizeInPixels * 0.82f)) * scale;
                RectangleF rect = new RectangleF(0, topOffset, size, fontSizeInPixels * 1.5f);

                // Thick stroke effect (stroke-width=2 in SVG)
                using (GraphicsPath pathText = new GraphicsPath()) {
                    pathText.AddString("WatchIt", family, (int)FontStyle.Bold, fontSizeInPixels, new PointF(size / 2.0f, topOffset), sf);
                    using (Pen pen = new Pen(Color.White, 3.0f * scale)) {
                        pen.LineJoin = LineJoin.Round;
                        g.DrawPath(pen, pathText);
                    }
                    g.FillPath(Brushes.White, pathText);
                }
            }

            bmp.Save(path, ImageFormat.Png);
        }
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

[IconGen]::CreateExactIcon(192, "c:\Users\HP\Desktop\WatchIt\public\icon-192.png")
[IconGen]::CreateExactIcon(512, "c:\Users\HP\Desktop\WatchIt\public\icon-512.png")
[IconGen]::CreateExactIcon(512, "c:\Users\HP\Desktop\WatchIt\public\apple-touch-icon.png")

Write-Host "Exact favicon PNG icons generated successfully!"
