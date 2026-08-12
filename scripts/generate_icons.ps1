$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;

public class IconGen {
    public static void CreateIcon(int size, string path) {
        using (Bitmap bmp = new Bitmap(size, size))
        using (Graphics g = Graphics.FromImage(bmp)) {
            g.Clear(Color.Black);
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Draw dark circle (#1c1b1b)
            using (SolidBrush darkBrush = new SolidBrush(Color.FromArgb(28, 27, 27))) {
                int margin = (int)(size * 0.1);
                int circleSize = (int)(size * 0.8);
                g.FillEllipse(darkBrush, margin, margin, circleSize, circleSize);
            }

            // Draw text "WatchIt"
            using (Font font = new Font("Arial", size * 0.13f, FontStyle.Bold))
            using (StringFormat sf = new StringFormat()) {
                sf.Alignment = StringAlignment.Center;
                sf.LineAlignment = StringAlignment.Center;
                RectangleF rect = new RectangleF(0, 0, size, size);
                g.DrawString("WatchIt", font, Brushes.White, rect, sf);
            }

            bmp.Save(path, ImageFormat.Png);
        }
    }
}
"@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

[IconGen]::CreateIcon(192, "c:\Users\HP\Desktop\WatchIt\public\icon-192.png")
[IconGen]::CreateIcon(512, "c:\Users\HP\Desktop\WatchIt\public\icon-512.png")
[IconGen]::CreateIcon(512, "c:\Users\HP\Desktop\WatchIt\public\apple-touch-icon.png")

Write-Host "Icons successfully generated as PNG!"
