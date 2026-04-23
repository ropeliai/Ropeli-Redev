export const iframeHtml = (code: string) => `
<!DOCTYPE html>
<html>
  <body>
    <div id="root"></div>
    <script type="module">
      try {
        ${code}
      } catch (e) {
        document.body.innerHTML =
          '<pre style="color:red">' + e + '</pre>';
      }
    </script>
  </body>
</html>
`;
