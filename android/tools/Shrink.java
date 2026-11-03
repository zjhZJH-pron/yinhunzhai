import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;

/* 用 JDK 自带的 ImageIO 把 256px 源图标缩成各密度启动图标，
   免得为这一步再引入任何图像工具。 */
public class Shrink {
    public static void main(String[] a) throws Exception {
        BufferedImage src = ImageIO.read(new File(a[0]));
        int[] sizes = {48, 72, 96, 144, 192};
        String[] names = {"mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"};
        for (int i = 0; i < sizes.length; i++) {
            int s = sizes[i];
            BufferedImage dst = new BufferedImage(s, s, BufferedImage.TYPE_INT_ARGB);
            Graphics2D g = dst.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING,
                    RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(src, 0, 0, s, s, null);
            g.dispose();
            File dir = new File(a[1] + File.separator + "mipmap-" + names[i]);
            dir.mkdirs();
            ImageIO.write(dst, "png", new File(dir, "ic_launcher.png"));
            System.out.println("mipmap-" + names[i] + " " + s + "px");
        }
    }
}
