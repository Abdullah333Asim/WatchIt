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
            // Fill 100% rectangle with solid black #000000
            g.Clear(Color.Black);
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;

            // Reduced font size (82px on 512x512) for comfortable margin & safe-zone fitting
            float scale = size / 512.0f;
            float fontSizeInPixels = 82.0f * scale;

            FontFamily family;
            try {
                family = new FontFamily("Inter");
            } catch {
                family = new FontFamily("Arial");
            }

            using (Font font = new Font(family, fontSizeInPixels, FontStyle.Bold, GraphicsUnit.Pixel))
            using (StringFormat sf = new StringFormat()) {
                sf.Alignment = StringAlignment.Center;
                sf.LineAlignment = StringAlignment.Center;

                // Center string cleanly in bounding box
                RectangleF rect = new RectangleF(0, 0, size, size);

                using (GraphicsPath pathText = new GraphicsPath()) {
                    pathText.AddString("WatchIt", family, (int)FontStyle.Bold, fontSizeInPixels, rect, sf);
                    using (Pen pen = new Pen(Color.White, 2.0f * scale)) {
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

Write-Host "PWA icons with safe-zone margins generated successfully!"
